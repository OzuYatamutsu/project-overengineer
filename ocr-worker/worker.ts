import { Job } from './lib/job'
import { JobStatus } from './lib/job-status'
import { WorkerState } from './lib/worker-state'
import { getRedis } from './lib/redis';
import Tesseract from 'tesseract.js';

const POLLING_PERIOD_MSECS = 1000

const SENTINEL_HOST = process.env.SENTINEL_HOST?.trim() || 'redis-sentinel'
const SENTINEL_PORT = Number(process.env.SENTINEL_PORT?.trim() || '26379')

console.log(`Connecting to sentinel: ${SENTINEL_HOST}:${SENTINEL_PORT}`)

let workerState: WorkerState = WorkerState.IDLE

async function pullJobDetails(jobId: string): Promise<Job> {
    return Job.fromRedisObject(
        await getRedis().hgetall(`job:${jobId}`)
    )
}

async function processJob(job: Job): Promise<Job> {
    const jobResult = await Tesseract.recognize(job.imageDataBase64)
    job.result = jobResult.data.text
    return job
}

async function commit(job: Job): Promise<void> {
    await getRedis().hset(`job:${job.id}`, job.serialize())
}

// TODO initial implementation is via polling, but switch to event-based
setInterval(async () => {
    if (workerState == WorkerState.PROCESSING) {
        return
    }

    // TODO horrible. use event-based processing instead
    // TODO this is just to test the OCR functionality works
    let keys = await getRedis().keys(`job:*`)
    if (keys == null) {
        return
    }
    for (const key of keys) {
        const status = await getRedis().hget(key, "status")
        if (status !== "WAITING") {
            continue
        }

        workerState = WorkerState.PROCESSING

        let job: Job = await pullJobDetails(key.replace("job:", ""))
        job.status = JobStatus.PROCESSING
        console.log(`Processing job with ID ${key}`)
        await commit(job)

        job = await processJob(job)
        job.status = JobStatus.DONE
        console.log(`Job with ID ${key} completed, committing`)
        await commit(job)

        workerState = WorkerState.IDLE
    }
}, POLLING_PERIOD_MSECS)
