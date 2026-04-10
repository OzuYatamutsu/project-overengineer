import { getRedis, log, pullAndWatchVaultConfigValues,
    registerGauge, startMetricsServer, registerCounter,
    startHostTelemetryJob, initTracing, getTracer
} from '@project-overengineer/shared-lib'
import type { Gauge, Counter, Span } from '@project-overengineer/shared-lib'
import http from "http"

const HEALTH_CHECK_PORT = (
    process.env.HEALTH_CHECK_PORT
    ? Number(process.env.HEALTH_CHECK_PORT)
    : 3000
)
const PROMETHEUS_METRICS_PORT = (
    process.env.PROMETHEUS_METRICS_PORT
    ? Number(process.env.PROMETHEUS_METRICS_PORT)
    : 4000
)
const POLLING_PERIOD_MSECS = 300000
export const JOB_TTL_SECS = 3600

let janitorJobDurationMsGauge: Gauge
let isIdleGauge: Gauge
let heartbeatGauge: Gauge
let errorCounter: Counter

export function jobIsStale(jobKey: string, createUTime: number): boolean {    
    if (Number.isNaN(createUTime)) {
        log("janitor", `jobId="${jobKey}"`, `Invalid create timestamp, discarding`)
        return true
    }

    if (((new Date().getTime() / 1000) - JOB_TTL_SECS) > createUTime) {
        log("janitor", `jobId="${jobKey}"`, `Job is completed or stale, discarding`)
        return true
    }

    return false
}

export async function _healthz(): Promise<boolean> {
    // Health check: ping redis and check if we can list jobs
    try {
        if (await getRedis("janitor").ping() != 'PONG') {
            log("janitor", `endpoint="/healthz"`, `failed, can't ping redis`)
            return false
        }
    } catch (err) {
        log("janitor", `endpoint="/healthz"`, `failed, can't ping redis: ${err}`)
        errorCounter.inc({ method: "ping_redis" })
        return false
    }

    try {
        await getRedis("janitor").keys(`job:*`)
    } catch (err) {
        log("janitor", `endpoint="/healthz"`, `failed, not able to list jobs: ${err}`)
        errorCounter.inc({ method: "list_jobs" })
        return false
    }

    return true
}

// poll redis for new jobs
setInterval(async () => {
    await getTracer("janitor").startActiveSpan("janitor_job", async (janitorJobSpan) => {
        var startTime = new Date().getTime()
        var jobsProcessed = 0
        var jobsDeleted = 0
        let childSpan: Span

        isIdleGauge.set(0)
        log("janitor", `job="cleanup"`, `starting job`)

        childSpan = getTracer("janitor").startSpan("fetch_jobs")
        const keys = await getRedis("janitor").keys(`job:*`)
        childSpan.end()

        for (const key of keys) {
            await getTracer("janitor").startActiveSpan("process_job", async (processJobSpan) => {
                try {
                    childSpan = getTracer("janitor").startSpan("fetch_job_hget")
                    const createUtime = Number(await getRedis("janitor").hget(key, "createUtime"))
                    childSpan.end()

                    if (jobIsStale(key, createUtime)) {
                        childSpan = getTracer("janitor").startSpan("delete_job")
                        await getRedis("janitor").del(key)
                        childSpan.end()

                        jobsDeleted++
                    }
                    jobsProcessed++
                } catch (err) {
                    log("janitor", `jobId="${key}"`, `failed to process job: ${err}`)
                    errorCounter.inc({ method: "process_job" })
                }
                processJobSpan.end()
            })
        }

        var endTime = new Date().getTime()
        janitorJobDurationMsGauge.set({ status: "success" }, endTime - startTime)
        isIdleGauge.set(1)

        log("janitor", `job="cleanup"`, `job finished`)
        janitorJobSpan.setAttribute("jobs_processed", jobsProcessed)
        janitorJobSpan.setAttribute("jobs_deleted", jobsDeleted)
        janitorJobSpan.end()
    })
}, POLLING_PERIOD_MSECS)

if (require.main === module) {
    // metrics endpoint
    log("janitor", `job="startup"`, `registering metrics`)
    janitorJobDurationMsGauge = registerGauge("janitor_job_duration_ms", "Duration of janitor job in milliseconds", ["status"])
    isIdleGauge = registerGauge("is_idle", "Whether this worker is idle (1 for idle, 0 for busy)")
    heartbeatGauge = registerGauge("heartbeat", "Heartbeat gauge to monitor if the worker is alive")
    errorCounter = registerCounter("errors_total", "Total number of unhandled errors", ["method"])

    log("janitor", `job="startup"`, `starting host telemetry job`)
    startHostTelemetryJob()

    heartbeatGauge.set(1)
    isIdleGauge.set(1)

    startMetricsServer(PROMETHEUS_METRICS_PORT)
    log("janitor", `job="startup" endpoint="/metrics"`, `metrics server is running on port ${PROMETHEUS_METRICS_PORT}`)

    initTracing("janitor").then(() => {
        log("janitor", `job="startup"`, `tracing initialized`)
    }).catch((err) => {
        log("janitor", `job="startup"`, `failed to initialize tracing: ${err}`)
    })

    pullAndWatchVaultConfigValues("janitor").then(() => {
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
            log("janitor", `job="startup" endpoint="/healthz"`, `listening on port ${HEALTH_CHECK_PORT}`)
        })
    })
}

log("janitor", `job="startup"`, `janitor started.`)
