import { Job } from '@project-overengineer/shared-lib/job'
import { JobStatus } from '@project-overengineer/shared-lib/job-status'
import { WorkerState } from '@project-overengineer/shared-lib/worker-state'
import { getRedis } from '@project-overengineer/shared-lib/redis'
import http from "http"

const OCR_ENDPOINT = process.env.OCR_ENDPOINT ?? "http://localhost:11434"
const POLLING_PERIOD_MSECS = 1000
const UPDATE_INTERVAL_MSECS = 5000
const HEALTH_CHECK_PORT = (
    process.env.HEALTH_CHECK_PORT
    ? Number(process.env.HEALTH_CHECK_PORT)
    : 3002
)

// Used to update progress bar. Update on each successful job.
let estimatedTimeSecs: number = 200.0
let workerState: WorkerState = WorkerState.IDLE

async function pullJobDetails(jobId: string): Promise<Job> {
    return Job.fromRedisObject(
        await getRedis().hgetall(`job:${jobId}`)
    )
}

export async function processJob(job: Job): Promise<Job> {
    let timeDelta = Date.now() / 1000

    console.log(`Job ${job.id} sent to OCR engine, processing...`)
    const jobResult = await fetch(`${OCR_ENDPOINT}/api/generate`, {
       method: "POST",
       headers: {"Content-Type": "application/json"},
       body: JSON.stringify({
           model: "ibm/granite3.3-vision:2b-q8_0",
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

    timeDelta = Math.round((Date.now() / 1000) - timeDelta)
    console.log(`OCR finished in ${timeDelta} secs`)

    if (!jobResult.ok) {
       throw new Error(`OCR failed: ${jobResult.statusText}`)
    }

    // Update estimated time
    estimatedTimeSecs = (timeDelta + estimatedTimeSecs) / 2

    const data = await jobResult.json()
    job.result = data.response?.trim() ?? "No text was found in the image!"
    return job 
}

async function commit(job: Job): Promise<void> {
    await getRedis().hset(`job:${job.id}`, job.serialize())
}

export async function _healthz(): Promise<boolean> {
    // Health check: ping redis and check if we can list jobs
    console.log("/healthz: hit, starting health check")

    console.log("/healthz: can we ping redis?")
    try {
        if (await getRedis().ping() != 'PONG') {
            console.log(`/healthz: failed, can't ping redis`)
            return false
        }

        console.log(`/healthz: able to ping redis`)
    } catch (err) {
        console.log(`/healthz: failed, can't ping redis: ${err}`)
        return false
    }

    console.log("/healthz: can we access jobs in redis?")
    try {
        await getRedis().scan('0', 'MATCH', 'job:*', 'COUNT', 1)
        console.log(`/healthz: able to access jobs in redis`)
    } catch (err) {
        console.log(`/healthz: failed, not able to access jobs in redis: ${err}`)
        return false
    }

    console.log("/healthz: health check pass")
    return true
}

// poll redis for new jobs
setInterval(async () => {
    if (workerState == WorkerState.PROCESSING) {
        return
    }

    const keys = await getRedis().keys(`job:*`)
    if (keys == null) {
        return
    }

    // O(n), but cheap because old jobs are cleaned up
    for (const key of keys) {
        const status = await getRedis().hget(key, "status")
        if (status !== "WAITING") {
            continue
        }

        workerState = WorkerState.PROCESSING

        let job: Job = await pullJobDetails(key.replace("job:", ""))
        job.status = JobStatus.PROCESSING
        console.log(`Processing job with ID ${key}`)
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
        }

        job.status = JobStatus.DONE
        console.log(`Job with ID ${key} completed, committing`)
        await commit(job)

        workerState = WorkerState.IDLE
    }
}, POLLING_PERIOD_MSECS)

if (require.main === module) {
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
        console.log(`/healthz endpoint on port ${HEALTH_CHECK_PORT}`)
    })
}

console.log(`OCR worker started.`)
