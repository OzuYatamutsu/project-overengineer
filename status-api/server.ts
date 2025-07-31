import express from 'express';
import { WebSocketServer } from "ws";
import http from 'http';
import { JobStatus, JobUpdate } from './lib/job-status';
import { Redis } from 'ioredis'

const app = express();
const port = Number(process.env.STATUS_API_PORT ?? '3001')
const POLLING_PERIOD_MSECS = 2000

const DUMMY_RESULT = `
DUMMY STATIC RESULT

2xLatte Macchiato 9.00
1xGloki 5.00
1xSchweinschnitzel 22.00
1xChässpätzli 18.50

Total 54.50
`;

app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const redis = new Redis({
    sentinels: [{
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? '26379')
    }],
    name: 'redis-master',
    password: process.env.REDIS_PASSWORD ?? 'b4yscx92yksfyv9c',
    sentinelPassword: process.env.REDIS_PASSWORD ?? 'b4yscx92yksfyv9c',
    db: 0
})

async function getJobState(jobId: string): Promise<JobUpdate> {
    const jobStatus = new JobUpdate(
        jobId,
        await redis.hget(`job:${jobId}`, 'status') as JobStatus ?? JobStatus.PROCESSING,
        await redis.hget(`job:${jobId}`, 'result') ?? ""
    )
    return new JobUpdate(
        jobId, JobStatus.DONE, DUMMY_RESULT
    )  // TODO
}

wss.on('connection', (ws, req) => {
    console.log(`${req.socket.remoteAddress}: New connection`)

    ws.on('message', (data) => {
        const message = JSON.parse(data.toString())
        const jobId = message.jobId

        console.log(`${req.socket.remoteAddress}: Monitor status for job ${jobId}`)

        // TODO stubbed function
        ws.send(new JobUpdate(
            jobId, JobStatus.PROCESSING, ""
        ).serialize())

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
