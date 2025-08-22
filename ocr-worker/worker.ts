import { Job } from '@project-overengineer/shared-lib/job'
import { JobStatus } from '@project-overengineer/shared-lib/job-status'
import { WorkerState } from '@project-overengineer/shared-lib/worker-state'
import { getRedis } from '@project-overengineer/shared-lib/redis';
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

// poll redis for new jobs
setInterval(async () => {
    if (workerState == WorkerState.PROCESSING) {
        return
    }

    const keys = await getRedis().keys(`job:*`)
    if (keys == null) {
        return
    }

    // O(n), but cheap because old jobs are cleaned up
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
