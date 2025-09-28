import express from 'express';
import { WebSocketServer, WebSocket, RawData } from "ws";
import http from 'http';
import { JobStatus, JobUpdate, rateLimit, getRedis } from '@project-overengineer/shared-lib';

const app = express();
const port = Number(process.env.STATUS_API_PORT) ?? 3001
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
        await getRedis().hget(`job:${jobId}`, 'status') as JobStatus ?? JobStatus.PROCESSING,
        await getRedis().hget(`job:${jobId}`, 'result') ?? "",
        Number(await getRedis().hget(`job:${jobId}`, 'progress')) ?? null
    )
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

app.get('/healthz', async (_, res) => {
    const result = await _healthz()

    if (result) {  // Health check pass
        res.writeHead(200, { "Content-Type": "text/plain" })
        res.end("OK")
    } else {
        res.writeHead(500, { "Content-Type": "text/plain" })
        res.end("ERROR")
    }
})

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    if (!rateLimit(req.socket.remoteAddress ?? 'unknown', MAX_REQUESTS, PER_SECS)) {
        console.log(`rejecting request from ${req.socket.remoteAddress}, rate limit exceeded`)
        ws.send('Rate limit exceeded')
        ws.close()
    }

    console.log(`${req.socket.remoteAddress}: New connection`)

    ws.on('message', (data: RawData) => {
        const message = JSON.parse(data.toString())
        const jobId = message.jobId

        console.log(`${req.socket.remoteAddress}: Monitor status for job ${jobId}`)

        setInterval(async () => {
            const jobState = await getJobState(jobId)
            ws.send(jobState.serialize())
            if (jobState.status == JobStatus.DONE) {
                ws.close()
            }
        }, POLLING_PERIOD_MSECS)
    })

    ws.on('close', () => {
        console.log(`${req.socket.remoteAddress}: Stop monitoring status (closed)`)
    })
})

if (!server.listening) {
    server.listen(port, async () => {
        console.log(`Status WS API listening on port ${port}`);
    });
}
