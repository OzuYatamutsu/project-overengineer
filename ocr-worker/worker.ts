import { 
    Job, JobStatus, WorkerState, getRedis, log,
    pullAndWatchVaultConfigValues, getImageEncryptionKey,
    startMetricsServer, registerGauge,
    registerCounter, startHostTelemetryJob
} from '@project-overengineer/shared-lib'
import type { Gauge, Counter } from '@project-overengineer/shared-lib'
import http from "http"

const OCR_ENDPOINT = process.env.OCR_ENDPOINT ?? "http://localhost:11434"
const POLLING_PERIOD_MSECS = 1000
const UPDATE_INTERVAL_MSECS = 5000
const IS_LITE = process.env.IS_LITE === "true"
const MODEL_NAME = IS_LITE ? "moondream:1.8b": "ibm/granite3.3-vision:2b-q8_0"
const HEALTH_CHECK_PORT = (
    process.env.HEALTH_CHECK_PORT
    ? Number(process.env.HEALTH_CHECK_PORT)
    : 3002
)
const PROMETHEUS_METRICS_PORT = (
    process.env.PROMETHEUS_METRICS_PORT
    ? Number(process.env.PROMETHEUS_METRICS_PORT)
    : 4000
)

// Used to update progress bar. Update on each successful job.
let estimatedTimeSecs: number = 200.0
let workerState: WorkerState = WorkerState.IDLE

// Telemetry
let jobDurationGauge: Gauge
let isIdleGauge: Gauge
let heartbeatGauge: Gauge
let errorCounter: Counter

async function pullJobDetails(jobId: string): Promise<Job> {
    return Job.fromRedisObject(
        await getRedis("ocr-worker").hgetall(`job:${jobId}`)
    )
}

export async function processJob(job: Job): Promise<Job> {
    let timeDelta = Date.now() / 1000
    job.decrypt(await getImageEncryptionKey("ocr-worker"))

    if (isIdleGauge) {
        isIdleGauge.set(0)
    }
    log("ocr-worker", `jobId="${job.id}"`, `Job sent to OCR engine, processing...`)
    const jobResult = await fetch(`${OCR_ENDPOINT}/api/generate`, {
       method: "POST",
       headers: {"Content-Type": "application/json"},
       body: JSON.stringify({
           model: MODEL_NAME,
           prompt: [
                "Itemize this receipt into a bulleted list.",
                "How much was paid for each item?",
                "What is the total amount shown on the receipt?",
                "Do not respond with any text not on the receipt."
           ].join(" "),
           images: [job.imageDataBase64],
           stream: false
       })
    })

    if (isIdleGauge) {
        isIdleGauge.set(1)
    }
    timeDelta = Math.round((Date.now() / 1000) - timeDelta)
    log("ocr-worker", `jobId="${job.id}" timeElapsed="${timeDelta}"`, `OCR finished`)

    if (!jobResult.ok) {
        if (jobDurationGauge) {
            jobDurationGauge.set({ status: "failure" }, timeDelta)
        }
        throw new Error(`OCR failed: ${jobResult.statusText}`)
    }

    if (jobDurationGauge) {
        jobDurationGauge.set({ status: "success" }, timeDelta)
    }

    // Update estimated time
    estimatedTimeSecs = (timeDelta + estimatedTimeSecs) / 2

    const data = await jobResult.json()
    job.result = data.response?.trim() ?? "No text was found in the image!"
    job.encrypt(await getImageEncryptionKey("ocr-worker"))
    return job
}

async function commit(job: Job): Promise<void> {
    await getRedis("ocr-worker").hset(`job:${job.id}`, job.serialize())
}

export async function _healthz(): Promise<boolean> {
    // Health check: ping redis and check if we can list jobs
    log("ocr-worker", `endpoint="/healthz"`, `starting health check`)

    try {
        if (await getRedis("ocr-worker").ping() != 'PONG') {
            log("ocr-worker", `endpoint="/healthz"`, `failed, can't ping redis`)
            return false
        }

    } catch (err) {
        log("ocr-worker", `endpoint="/healthz"`, `failed, can't ping redis: ${err}`)
        return false
    }

    try {
        await getRedis("ocr-worker").scan('0', 'MATCH', 'job:*', 'COUNT', 1)
    } catch (err) {
        log("ocr-worker", `endpoint="/healthz"`, `failed, not able to access jobs in redis: ${err}`)
        return false
    }

    log("ocr-worker", `endpoint="/healthz"`, `health check pass`)
    return true
}

// poll redis for new jobs
setInterval(async () => {
    if (workerState == WorkerState.PROCESSING) {
        return
    }

    const keys = await getRedis("ocr-worker").keys(`job:*`)
    if (keys == null) {
        return
    }

    // O(n), but cheap because old jobs are cleaned up
    for (const key of keys) {
        const status = await getRedis("ocr-worker").hget(key, "status")
        if (status !== "WAITING") {
            continue
        }

        workerState = WorkerState.PROCESSING

        let job: Job = await pullJobDetails(key.replace("job:", ""))
        job.status = JobStatus.PROCESSING
        log("ocr-worker", `jobId="${job.id}"`, `Job sent to OCR engine, processing...`)
        await commit(job)

        const startTime = (Date.now() / 1000)

        setInterval(async () => {
            const elapsedTime = (Date.now() / 1000) - startTime
            job.progress = Math.round((elapsedTime / estimatedTimeSecs) * 100)
            await commit(job)
        }, UPDATE_INTERVAL_MSECS)

        try {
            job = await processJob(job)
        } catch (error) {
            job.result = error?.toString() ?? "" 
            if (errorCounter) {
                errorCounter.inc({ method: "process_job" })
            }
        }

        job.status = JobStatus.DONE
        log("ocr-worker", `jobId="${job.id}"`, `Job completed, committing`)
        await commit(job)

        workerState = WorkerState.IDLE
    }
}, POLLING_PERIOD_MSECS)

if (require.main === module) {
    pullAndWatchVaultConfigValues("ocr-worker").then(() => {
        // Health check endpoint
        http.createServer(async (req, res) => {
            if (req.url === "/healthz") {
                const result = await _healthz()

                res.writeHead(
                    result ? 200 : 500,
                    { "Content-Type": "text/plain" }
                )
                res.end(
                    result ? "OK" : "ERROR"
                )
            } else {
                res.writeHead(404, { "Content-Type": "text/plain" })
                res.end("Not Found")
            }
        }).listen(HEALTH_CHECK_PORT, () => {
            log("ocr-worker", `job="startup" endpoint="/healthz"`, `listening on port ${HEALTH_CHECK_PORT}`)
        })
    })

    // metrics endpoint
    log("ocr-worker", `job="startup"`, `registering metrics`)
    jobDurationGauge = registerGauge("job_duration_seconds", "Duration of last OCR job in seconds", ["status"])
    isIdleGauge = registerGauge("is_idle", "Whether this worker is idle (1 for idle, 0 for busy)")
    heartbeatGauge = registerGauge("heartbeat", "Heartbeat gauge to monitor if the worker is alive")
    errorCounter = registerCounter("errors_total", "Total number of unhandled errors", ["method"])

    log("ocr-worker", `job="startup"`, `starting host telemetry job`)
    startHostTelemetryJob()

    isIdleGauge.set(1)
    heartbeatGauge.set(1)

    startMetricsServer(PROMETHEUS_METRICS_PORT)
    log("ocr-worker", `job="startup" endpoint="/metrics"`, `metrics server is running on port ${PROMETHEUS_METRICS_PORT}`)
}

log("ocr-worker", `job="startup"`, `OCR worker started.`)
