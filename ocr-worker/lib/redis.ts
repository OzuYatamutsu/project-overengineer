import Redis from "ioredis";
import { enforceConfig } from "./verify";

let redis: Redis

export function getRedis(): Redis {
    enforceConfig("REDIS_HOST")
    enforceConfig("REDIS_PORT")
    enforceConfig("REDIS_PASSWORD")

    if (!redis) {
        console.log(`Opening new Redis connection (primary: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT})`)

        redis = new Redis({
            sentinels: !!(process.env.SENTINEL_HOST) ? [{
                host: process.env.SENTINEL_HOST,
                port: Number(process.env.SENTINEL_PORT)
            }] : undefined,
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            name: 'redis-master',
            password: process.env.REDIS_PASSWORD,
            db: 0
        })
    }

    return redis
}
