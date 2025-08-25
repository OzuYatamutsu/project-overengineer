import { getRedis } from '@project-overengineer/shared-lib/redis';

const POLLING_PERIOD_MSECS = 300000
const JOB_TTL_SECS = 3600

// poll redis for new jobs
setInterval(async () => {
    console.log("janitor: starting cleanup job")

    const keys = await getRedis().keys(`job:*`)

    for (const key of keys) {
        const createUtime = Number(await getRedis().hget(key, "createUtime"))
        
        if (Number.isNaN(createUtime)) {
            console.log(`janitor: Job ${key} has an invalid create timestamp, discarding`)
            getRedis().del(key)
            break
        }

        if ((new Date().getTime() - JOB_TTL_SECS) > createUtime) {
            console.log(`janitor: Job ${key} is completed or stale, discarding`)
            getRedis().del(key)
            break
        }
    }

    console.log("janitor: cleanup job finished")
}, POLLING_PERIOD_MSECS)
