import { getRedis, log, pullAndWatchVaultConfigValues } from '@project-overengineer/shared-lib'
import http from "http"

const HEALTH_CHECK_PORT = (
    process.env.HEALTH_CHECK_PORT
    ? Number(process.env.HEALTH_CHECK_PORT)
    : 3000
)
const POLLING_PERIOD_MSECS = 300000
export const JOB_TTL_SECS = 3600

export function jobIsStale(jobKey: string, createUTime: number): boolean {    
    if (Number.isNaN(createUTime)) {
        log("janitor", `Job ${jobKey} has an invalid create timestamp, discarding`)
        return true
    }

    if (((new Date().getTime() / 1000) - JOB_TTL_SECS) > createUTime) {
        log("janitor", `Job ${jobKey} is completed or stale, discarding`)
        return true
    }

    return false
}

export async function _healthz(): Promise<boolean> {
    // Health check: ping redis and check if we can list jobs
    log("janitor", "/healthz: starting health check")

    try {
        if (await getRedis("janitor").ping() != 'PONG') {
            log("janitor", `/healthz: failed, can't ping redis`)
            return false
        }
    } catch (err) {
        log("janitor", `/healthz: failed, can't ping redis: ${err}`)
        return false
    }

    try {
        await getRedis("janitor").keys(`job:*`)
    } catch (err) {
        log("janitor", `/healthz: failed, not able to list jobs: ${err}`)
        return false
    }

    log("janitor", "/healthz: health check pass")
    return true
}

// poll redis for new jobs
setInterval(async () => {
    log("janitor", "starting cleanup job")
    const keys = await getRedis("janitor").keys(`job:*`)

    for (const key of keys) {
        const createUtime = Number(await getRedis("janitor").hget(key, "createUtime"))
        if (jobIsStale(key, createUtime)) {
            getRedis("janitor").del(key)
        }
    }

    log("janitor", "cleanup job finished")
}, POLLING_PERIOD_MSECS)

if (require.main === module) {
    pullAndWatchVaultConfigValues("janitor")

    // Health check endpoint
    http.createServer(async (req, res) => {
        if (req.url === "/healthz") {
            const result = await _healthz()

            res.writeHead(
                result ? 200 : 500,
                { "Content-Type": "text/plain" }
            )
            res.end(
                result ? "OK" : "ERROR"
            )
        } else {
            res.writeHead(404, { "Content-Type": "text/plain" })
            res.end("Not Found")
        }
    }).listen(HEALTH_CHECK_PORT, () => {
        log("janitor", `startup: /healthz endpoint on port ${HEALTH_CHECK_PORT}`)
    })
}

log("janitor", `startup: janitor started.`)
