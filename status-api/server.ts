import express from 'express';
import { WebSocketServer } from "ws";
import http from 'http';
import { JobStatus, JobUpdate } from './lib/job-status';
import { getRedis } from './lib/redis';
import { enforceConfig } from './lib/verify';

const app = express();
const port = Number(process.env.STATUS_API_PORT) ?? 3001
const POLLING_PERIOD_MSECS = 2000

app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

async function getJobState(jobId: string): Promise<JobUpdate> {
    return new JobUpdate(
        jobId,
        await getRedis().hget(`job:${jobId}`, 'status') as JobStatus ?? JobStatus.PROCESSING,
        await getRedis().hget(`job:${jobId}`, 'result') ?? ""
    )
}

wss.on('connection', (ws, req) => {
    console.log(`${req.socket.remoteAddress}: New connection`)

    ws.on('message', (data) => {
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
