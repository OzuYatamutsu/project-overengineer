import { getRedis } from '@project-overengineer/shared-lib';
import http from "http";

const HEALTH_CHECK_PORT = 3000
const POLLING_PERIOD_MSECS = 300000
export const JOB_TTL_SECS = 3000

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

export async function _healthz(): Promise<boolean> {
    // Health check: ping redis and check if we can list jobs
    console.log("/healthz: hit, starting health check")

    console.log("/healthz: can we ping redis?")
    try {
        if (await getRedis().ping() != 'PONG') {
            console.log(`/healthz: failed, can't ping redis`)
            return false
        }

        console.log(`/healthz: able to ping redis`)
    } catch (err) {
        console.log(`/healthz: failed, can't ping redis: ${err}`)
        return false
    }

    console.log("/healthz: can we list jobs?")
    try {
        await getRedis().keys(`job:*`)
        console.log(`/healthz: able to list jobs`)
    } catch (err) {
        console.log(`/healthz: failed, not able to list jobs: ${err}`)
        return false
    }

    console.log("/healthz: health check pass")
    return true
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

// start health check server
http.createServer(async (req, res) => {
    if (req.url === "/healthz") {
        const result = await _healthz()

        if (result) {  // Health check pass
            res.writeHead(204, { "Content-Type": "text/plain" })
            res.end("OK")
        } else {
            res.writeHead(500, { "Content-Type": "text/plain" })
            res.end("ERROR")
        }
    } else {
        res.writeHead(404, { "Content-Type": "text/plain" })
        res.end("Not Found")
    }
}).listen(HEALTH_CHECK_PORT, () => {
    console.log(`/healthz endpoint on port ${HEALTH_CHECK_PORT}`)
});

console.log(`Janitor started.`);
