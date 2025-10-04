import express from 'express'
import { WebSocketServer, WebSocket, RawData } from "ws"
import http from 'http'
import { JobStatus, JobUpdate, rateLimit, getRedis, log } from '@project-overengineer/shared-lib'

const app = express();
export const port = Number(process.env.STATUS_API_PORT) ?? 3001
const POLLING_PERIOD_MSECS = 2000

// Max 1 request per sec
const MAX_REQUESTS = 60
const PER_SECS = 60

app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

async function getJobState(jobId: string): Promise<JobUpdate> {
    return new JobUpdate(
        jobId,
        await getRedis("status-api").hget(`job:${jobId}`, 'status') as JobStatus ?? JobStatus.PROCESSING,
        await getRedis("status-api").hget(`job:${jobId}`, 'result') ?? "",
        Number(await getRedis("status-api").hget(`job:${jobId}`, 'progress')) ?? null
    )
}

export async function _healthz(): Promise<boolean> {
    // Health check: ping redis and check if we can list jobs
    log("status-api", "/healthz: starting health check")

    try {
        if (await getRedis("status-api").ping() != 'PONG') {
            log("status-api", `/healthz: failed, can't ping redis`)
            return false
        }

    } catch (err) {
        log("status-api", `/healthz: failed, can't ping redis: ${err}`)
        return false
    }

    try {
        await getRedis("status-api").scan('0', 'MATCH', 'job:*', 'COUNT', 1)
    } catch (err) {
        log("status-api", `/healthz: failed, not able to access jobs in redis: ${err}`)
        return false
    }

    log("status-api", "/healthz: health check pass")
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
        log("status-api", `rejecting request from ${req.socket.remoteAddress}, rate limit exceeded`)
        ws.send('Rate limit exceeded')
        ws.close()
    }

    log("status-api", `${req.socket.remoteAddress}: New connection`)

    ws.on('message', (data: RawData) => {
        const message = JSON.parse(data.toString())
        const jobId = message.jobId

        log("status-api", `${req.socket.remoteAddress}: Monitor status for job ${jobId}`)

        setInterval(async () => {
            const jobState = await getJobState(jobId)
            ws.send(jobState.serialize())
            if (jobState.status == JobStatus.DONE) {
                ws.close()
            }
        }, POLLING_PERIOD_MSECS)
    })

    ws.on('close', () => {
        log("status-api", `${req.socket.remoteAddress}: Stop monitoring status (closed)`)
    })
})

if (require.main === module) {
    server.listen(port, async () => {
        log("status-api", `Status WS API listening on port ${port}`)
    })
}
