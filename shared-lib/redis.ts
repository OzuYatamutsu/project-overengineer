import Redis from "ioredis"
import { enforceConfig } from "./verify"
import { log } from "./logging"

let redis: Redis

export function getRedis(serviceName: string): Redis {
    enforceConfig(serviceName, "REDIS_HOST")
    enforceConfig(serviceName, "REDIS_PORT")
    enforceConfig(serviceName, "REDIS_PASSWORD")

    if (!redis) {
        log(
            serviceName,
            `Opening new Redis connection (primary=${process.env.REDIS_HOST}:${process.env.REDIS_PORT}, sentinel(s): `
            + (
                process.env.SENTINEL_HOST
                ? process.env.SENTINEL_HOST + ":" + process.env.SENTINEL_PORT 
                : "no"
                )
            + ")"
        )

        redis = new Redis({
            sentinels: process.env.SENTINEL_HOST ? [{
                host: process.env.SENTINEL_HOST,
                port: Number(process.env.SENTINEL_PORT)
            }] : undefined,
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            name: 'redis-master',
            username: 'default',
            password: process.env.REDIS_PASSWORD,
            db: 0
        })
    }

    return redis
}
