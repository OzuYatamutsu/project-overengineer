import assert from "assert";
import Redis from "ioredis";

export function enforceConfig(configKey: string, print=false): void {
    assert(!!process.env[configKey], `The required env var ${configKey} wasn't set!`)
    if (print) {
        console.log(`config: ${configKey}=${process.env[configKey]}`)
    }
}

export async function enforceRedisReachable(): Promise<void> {
    enforceConfig("SENTINEL_HOST")
    enforceConfig("SENTINEL_PORT")
    enforceConfig("REDIS_PASSWORD")

    const redis = new Redis({
        sentinels: [{
            host: process.env.SENTINEL_HOST,
            port: Number(process.env.SENTINEL_PORT)
        }],
        name: 'redis-master',
        password: process.env.REDIS_PASSWORD,
        db: 0,
        enableReadyCheck: true
    })

    assert(!!(await redis.ping()), "Redis didn't respond to PING! Is it reachable?")
}
