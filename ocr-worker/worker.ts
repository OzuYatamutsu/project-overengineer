import { Redis } from 'ioredis'
import { Job } from './lib/job'

const DUMMY_RESULT = `
DUMMY STATIC RESULT

2xLatte Macchiato 9.00
1xGloki 5.00
1xSchweinschnitzel 22.00
1xChässpätzli 18.50

Total 54.50
`;
const POLLING_PERIOD_MSECS = 1000

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

let workerState: WorkerState = WorkerState.IDLE

async function pullJobDetails(jobId: string): Promise<Job> {
    return Job.fromRedisObject(
        await redis.hgetall(`job:${jobId}`)
    )
}

async function processJob(job: Job): Promise<Job> {
    job.result = DUMMY_RESULT  // TODO
    return job
}

async function commitJobResult(job: Job): Promise<void> {
    await redis.hset(`job:${job.id}`, job.serialize())
}

// TODO initial implementation is via polling, but switch to event-based
setInterval(async () => {
    if (workerState == WorkerState.PROCESSING) {
        return
    }

    // TODO horrible. use event-based processing instead
    // TODO this is just to test the OCR functionality works
    let keys = await redis.get(`job:*`)
    if (keys == null) {
        return
    }
    for (const key of keys) {
        const status = await redis.hget(key, "status")
        if (status === "WAITING") {
            workerState = WorkerState.PROCESSING

            let job: Job = await pullJobDetails(key)
            job = await processJob(job)
            await commitJobResult(job)

            workerState = WorkerState.IDLE
        }
    }
})
