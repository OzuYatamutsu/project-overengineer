import { Job } from '@project-overengineer/shared-lib/job'
import { JobStatus } from '@project-overengineer/shared-lib/job-status'
import { WorkerState } from '@project-overengineer/shared-lib/worker-state'
import { getRedis } from '@project-overengineer/shared-lib/redis';

const OCR_ENDPOINT = "http://localhost:11434"
const POLLING_PERIOD_MSECS = 1000

let workerState: WorkerState = WorkerState.IDLE

async function pullJobDetails(jobId: string): Promise<Job> {
    return Job.fromRedisObject(
        await getRedis().hgetall(`job:${jobId}`)
    )
}

export async function processJob(job: Job): Promise<Job> {
    console.log(`Sending job ${job.id} to OCR engine...`)
    const jobResult =
    await fetch(`${OCR_ENDPOINT}/api/generate`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            model: "llama3.2-vision:11b",
            prompt: "The following image is a receipt. Can you reply with \
                     a formatted representation of what's in the receipt?",
            images: [job.imageDataBase64],
            stream: false
        }),
    })
    
    if (!jobResult.ok) {
        throw new Error(`Ollama OCR failed: ${jobResult.statusText}`)
    } 
    
    const data = await jobResult.json()
    job.result = data.response?.trim() ?? ""
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

        try { 
            job = await processJob(job)
        } catch (error) {
            job.result = error?.toString() ?? "" 
        }

        job.status = JobStatus.DONE
        console.log(`Job with ID ${key} completed, committing`)
        await commit(job)

        workerState = WorkerState.IDLE
    }
}, POLLING_PERIOD_MSECS)
