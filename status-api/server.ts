import express from 'express'
import { WebSocketServer, WebSocket, RawData } from "ws"
import http from 'http'
import { 
    JobStatus, JobUpdate, rateLimit, getRedis, log,
    pullAndWatchVaultConfigValues, verifyJwt,
    Counter, Gauge,
    registerGauge,
    startHostTelemetryJob,
    registerCounter,
    startMetricsServer
} from '@project-overengineer/shared-lib'

const app = express();
export const port = Number(process.env.STATUS_API_PORT) || 3001
const PROMETHEUS_METRICS_PORT = (
    process.env.PROMETHEUS_METRICS_PORT
    ? Number(process.env.PROMETHEUS_METRICS_PORT)
    : 4000
)
const POLLING_PERIOD_MSECS = 2000
const _IS_UNIT_TESTING = !!process.env["_IS_UNIT_TESTING"]

// Max 1 request per sec
const MAX_REQUESTS = 60
const PER_SECS = 60

app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let activeWsConnectionCount: number = 0
let activeWsConnectionCountGauge: Gauge
let abortedWsCounter: Counter
let closedWsCounter: Counter
let heartbeatGauge: Gauge
let errorCounter: Counter

async function getJobState(jobId: string, jwt: string): Promise<JobUpdate> {
    if (!(await verifyJwt("status-api", jwt, jobId, _IS_UNIT_TESTING))) {
        throw new Error(`error getting job state for id ${jobId}; jwt failed validation`)
    }
    return new JobUpdate(
        jobId,
        await getRedis("status-api").hget(`job:${jobId}`, 'status') as JobStatus ?? JobStatus.PROCESSING,
        await getRedis("status-api").hget(`job:${jobId}`, 'result') ?? "",
        Number(await getRedis("status-api").hget(`job:${jobId}`, 'progress')) || 0
    )
}

export async function _healthz(): Promise<boolean> {
    // Health check: ping redis and check if we can list jobs
    log("status-api", `endpoint="/healthz"`, "starting health check")

    try {
        if (await getRedis("status-api").ping() != 'PONG') {
            log("status-api", `endpoint="/healthz"`, "failed, can't ping redis")
            return false
        }

    } catch (err) {
        log("status-api", `endpoint="/healthz"`, `failed, can't ping redis: ${err}`)
        return false
    }

    try {
        await getRedis("status-api").scan('0', 'MATCH', 'job:*', 'COUNT', 1)
    } catch (err) {
        log("status-api", `endpoint="/healthz"`, `failed, not able to access jobs in redis: ${err}`)
        return false
    }

    log("status-api", `endpoint="/healthz"`, `health check pass`)
    return true
}

// Health check endpoint
app.get('/healthz', async (_, res) => {
    const result = await _healthz()

    res.writeHead(
        result ? 200 : 500,
        { "Content-Type": "text/plain" }
    )
    res.end(
        result ? "OK" : "ERROR"
    )
})

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    if (!rateLimit("status-api", req.socket.remoteAddress ?? 'unknown', MAX_REQUESTS, PER_SECS)) {
        log("status-api", `endpoint="/ws" request_addr="${req.socket.remoteAddress}"`, `rejecting request, rate limit exceeded`)
        ws.send('Rate limit exceeded')
        ws.close()
        abortedWsCounter.inc()
    }

    log("status-api", `endpoint="/ws" request_addr="${req.socket.remoteAddress}"`, `New connection`)
    activeWsConnectionCount += 1
    activeWsConnectionCountGauge.set(activeWsConnectionCount)

    ws.on('message', (data: RawData) => {
        const message = JSON.parse(data.toString())
        const jobId = message.job?.jobId ?? undefined
        const jwt = message.jwt ?? undefined

        if (jobId === undefined || jwt === undefined) {
            log("status-api", `endpoint="/ws" request_addr="${req.socket.remoteAddress}"`, `rejecting malformed api request`)
            abortedWsCounter.inc()
            ws.close()
        }

        log("status-api", `endpoint="/ws" request_addr="${req.socket.remoteAddress}" jobId="${jobId}"`, `monitoring status`)

        setInterval(async () => {
            try {
                const jobState = await getJobState(jobId, jwt)
                ws.send(jobState.serialize())
                if (jobState.status == JobStatus.DONE) {
                    log("status-api", `endpoint="/ws" request_addr="${req.socket.remoteAddress}" jobId="${jobId}"`, `Job is done, closing connection`)
                    closedWsCounter.inc()
                    ws.close()
                }
            } catch (err) {
                log("status-api", `endpoint="/ws" request_addr="${req.socket.remoteAddress}" jobId="${jobId}"`, `error getting job state: ${err}`)
                abortedWsCounter.inc()
                errorCounter.inc({ method: "get_job_state" })
                ws.close()
            }
        }, POLLING_PERIOD_MSECS)
    })

    ws.on('close', () => {
        log("status-api", `endpoint="/ws" request_addr="${req.socket.remoteAddress}"`, `Stop monitoring status (closed)`)
        activeWsConnectionCount -= 1
        activeWsConnectionCountGauge.set(activeWsConnectionCount)
    })
})

if (require.main === module) {
    if (_IS_UNIT_TESTING) {
        server.listen(port, async () => {
            log("status-api", `job="startup" endpoint="/ws"`, `Status WS API listening on port ${port}`)
        })
    }

    else {
        pullAndWatchVaultConfigValues("status-api").then(() => {
            server.listen(port, async () => {
                log("status-api", `job="startup" endpoint="/ws"`, `Status WS API listening on port ${port}`)
            })
        })
    }

    // metrics endpoint
    log("status-api", `job="startup"`, `registering metrics`)
    activeWsConnectionCountGauge = registerGauge("active_ws_connections", "Number of active WebSocket connections to the status API")
    abortedWsCounter = registerCounter("aborted_ws_connections_total", "Total number of aborted WebSocket connections")
    closedWsCounter = registerCounter("closed_ws_connections_total", "Total number of cleanly closed WebSocket connections")
    heartbeatGauge = registerGauge("heartbeat", "Heartbeat gauge to monitor if the worker is alive")
    errorCounter = registerCounter("errors_total", "Total number of unhandled errors", ["method"])

    log("status-api", `job="startup"`, `starting host telemetry job`)
    startHostTelemetryJob()

    heartbeatGauge.set(1)

    startMetricsServer(PROMETHEUS_METRICS_PORT)
    log("status-api", `job="startup" endpoint="/metrics"`, `metrics server is running on port ${PROMETHEUS_METRICS_PORT}`)
}
