import { getRedis } from '@project-overengineer/shared-lib/redis';

const POLLING_PERIOD_MSECS = 300000
const JOB_TTL_SECS = 3600

async function jobIsStale(jobKey: string): Promise<boolean> {
    const createUtime = Number(
        await getRedis().hget(jobKey, "createUtime")
    )
    
    if (Number.isNaN(createUtime)) {
        console.log(`janitor: Job ${jobKey} has an invalid create timestamp, discarding`)
        return true
    }

    if ((new Date().getTime() - JOB_TTL_SECS) > createUtime) {
        console.log(`janitor: Job ${jobKey} is completed or stale, discarding`)
        return true
    }

    return false
}

// poll redis for new jobs
setInterval(async () => {
    console.log("janitor: starting cleanup job")
    const keys = await getRedis().keys(`job:*`)

    for (const key of keys) {
        if (await jobIsStale(key)) {
            getRedis().del(key)
        }
    }

    console.log("janitor: cleanup job finished")
}, POLLING_PERIOD_MSECS)
