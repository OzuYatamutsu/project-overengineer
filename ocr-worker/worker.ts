import { Job } from '@project-overengineer/shared-lib/job'
import { JobStatus } from '@project-overengineer/shared-lib/job-status'
import { WorkerState } from '@project-overengineer/shared-lib/worker-state'
import { getRedis } from '@project-overengineer/shared-lib/redis';

const OCR_ENDPOINT = process.env.OCR_ENDPOINT ?? "http://localhost:11434"
const POLLING_PERIOD_MSECS = 1000
const UPDATE_INTERVAL_MSECS = 5000
const MAX_PROCESSING_TIME_SECS = 600

// Used to update progress bar. Update on each successful job.
let estimatedTimeSecs: number = 200.0
let workerState: WorkerState = WorkerState.IDLE

async function pullJobDetails(jobId: string): Promise<Job> {
    return Job.fromRedisObject(
        await getRedis().hgetall(`job:${jobId}`)
    )
}

export async function processJob(job: Job): Promise<Job> {
    let timeDelta = Date.now() / 1000

    console.log(`Sending job ${job.id} to OCR engine...`)
    const jobResult = await fetch(`${OCR_ENDPOINT}/api/generate`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            model: "granite3.2-vision",
            prompt: "Can you itemize this receipt to a bulleted list? Make sure to include the price.",
            images: [job.imageDataBase64],
            stream: false
        }),
        signal: AbortSignal.timeout(MAX_PROCESSING_TIME_SECS * 1000)
    })

    timeDelta = Math.round((Date.now() / 1000) - timeDelta)
    console.log(`OCR finished in ${timeDelta} secs`)

    if (!jobResult.ok) {
        throw new Error(`Ollama OCR failed: ${jobResult.statusText}`)
    }

    // Update estimated time
    estimatedTimeSecs = (timeDelta + estimatedTimeSecs) / 2

    const data = await jobResult.json()
    job.result = data.response?.trim() ?? "No text was found in the image!"
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

        const startTime = (Date.now() / 1000)

        setInterval(async () => {
            const elapsedTime = (Date.now() / 1000) - startTime
            job.progress = Math.round((elapsedTime / estimatedTimeSecs) * 100)
            await commit(job)
        }, UPDATE_INTERVAL_MSECS)

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
