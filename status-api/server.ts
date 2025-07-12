import express, { Request, Response } from 'express';
import { WebSocketServer } from "ws";
import http from 'http';
import { JobStatus, JobUpdate } from '../lib/job-status';

const app = express();
const port = 3001;  // TODO

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

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        const message = JSON.parse(data.toString())
        const jobId = message.jobId

        // TODO stubbed function
        ws.send(new JobUpdate(
            jobId, JobStatus.PROCESSING, ""
        ).serialize())

        setTimeout(() => {
            ws.send(new JobUpdate(
                jobId, JobStatus.DONE, DUMMY_RESULT
            ).serialize())
            ws.close()
        }, 2000)
    })

    // ws.on('close', () => {})
})

server.listen(port, () => {
  console.log(`Status WS API listening on port ${port}`);
});
