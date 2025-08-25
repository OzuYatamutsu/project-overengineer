import { Job } from '@project-overengineer/shared-lib/job'
import { getRedis } from '@project-overengineer/shared-lib/redis';

const POLLING_PERIOD_MSECS = 1000
const JOB_TTL_SECS = 3600

async function pullJobDetails(jobId: string): Promise<Job> {
    return Job.fromRedisObject(
        await getRedis().hgetall(`job:${jobId}`)
    )
}

// poll redis for new jobs
setInterval(async () => {
    console.log("janitor: starting cleanup job")

    const keys = await getRedis().keys(`job:*`)
    if (keys == null) {
        return
    }

    for (const key of keys) {
        const createUtime = Number(await getRedis().hget(key, "createUtime"))
        
        if (Number.isNaN(createUtime)) {
            console.log(`janitor: Job ${key} has an invalid create timestamp, discarding`)
            getRedis().del(key)
            return
        }

        if ((new Date().getTime() - JOB_TTL_SECS) > createUtime) {
            console.log(`janitor: Job ${key} is completed or stale, discarding`)
            getRedis().del(key)
            return
        }

        console.log("janitor: cleanup job finished")

    }
}, POLLING_PERIOD_MSECS)
