import express from 'express';
import { WebSocketServer } from "ws";
import http from 'http';
import { JobStatus, JobUpdate } from './lib/job-status';
import { Redis } from 'ioredis'

const app = express();
const port = Number(process.env.STATUS_API_PORT ?? '3001')
const POLLING_PERIOD_MSECS = 2000

const SENTINEL_HOST = process.env.SENTINEL_HOST?.trim() || 'redis-sentinel'
const SENTINEL_PORT = Number(process.env.SENTINEL_PORT?.trim() || '26379')

console.log(`Connecting to sentinel: ${SENTINEL_HOST}:${SENTINEL_PORT}`)

app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const redis = new Redis({
    sentinels: [{
        host: SENTINEL_HOST,
        port: SENTINEL_PORT
    }],
    name: 'redis-master',
    password: process.env.REDIS_PASSWORD ?? 'b4yscx92yksfyv9c',
    sentinelPassword: process.env.REDIS_PASSWORD ?? 'b4yscx92yksfyv9c',
    db: 0
})

async function getJobState(jobId: string): Promise<JobUpdate> {
    return new JobUpdate(
        jobId,
        await redis.hget(`job:${jobId}`, 'status') as JobStatus ?? JobStatus.PROCESSING,
        await redis.hget(`job:${jobId}`, 'result') ?? ""
    )
}

wss.on('connection', (ws, req) => {
    console.log(`${req.socket.remoteAddress}: New connection`)

    ws.on('message', (data) => {
        const message = JSON.parse(data.toString())
        const jobId = message.jobId

        console.log(`${req.socket.remoteAddress}: Monitor status for job ${jobId}`)

        setTimeout(async () => {
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

server.listen(port, () => {
  console.log(`Status WS API listening on port ${port}`);
});
