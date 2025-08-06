import express from 'express';
import { WebSocketServer } from "ws";
import http from 'http';
import { JobStatus, JobUpdate } from './lib/job-status';
import { Redis } from 'ioredis'
import { enforceConfig, enforceRedisReachable } from './lib/verify';

const app = express();
const port = Number(process.env.STATUS_API_PORT)
const POLLING_PERIOD_MSECS = 2000

enforceConfig("SENTINEL_HOST", true)
enforceConfig("SENTINEL_PORT", true)
enforceConfig("REDIS_PASSWORD", true)
enforceConfig("STATUS_API_PORT", true)
enforceRedisReachable()

app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const redis = new Redis({
    sentinels: [{
        host: process.env.SENTINEL_HOST,
        port: Number(process.env.SENTINEL_PORT)
    }],
    name: 'redis-master',
    password: process.env.REDIS_PASSWORD,
    sentinelPassword: process.env.REDIS_PASSWORD,
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
  enforceConfig("SENTINEL_HOST", true)
  enforceConfig("SENTINEL_PORT", true)
  enforceConfig("REDIS_PASSWORD", true)
  enforceRedisReachable()

  console.log(`Status WS API listening on port ${port}`);
});
