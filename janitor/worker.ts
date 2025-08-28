import { getRedis } from '@project-overengineer/shared-lib/redis';

const POLLING_PERIOD_MSECS = 300000
export const JOB_TTL_SECS = 3600

export function jobIsStale(jobKey: string, createUTime: number): boolean {    
    if (Number.isNaN(createUTime)) {
        console.log(`janitor: Job ${jobKey} has an invalid create timestamp, discarding`)
        return true
    }

    if (((new Date().getTime() / 1000) - JOB_TTL_SECS) > createUTime) {
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
        const createUtime = Number(await getRedis().hget(key, "createUtime"))
        if (jobIsStale(key, createUtime)) {
            getRedis().del(key)
        }
    }

    console.log("janitor: cleanup job finished")
}, POLLING_PERIOD_MSECS)
