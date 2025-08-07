import Redis from "ioredis";
import { enforceConfig } from "./verify";

let redis: Redis

export function getRedis(): Redis {
    enforceConfig("SENTINEL_HOST")
    enforceConfig("SENTINEL_PORT")
    enforceConfig("REDIS_PASSWORD")

    if (!redis) {
        redis = new Redis({
            sentinels: !process.env.SKIP_SENTINEL ? [{
                host: process.env.SENTINEL_HOST,
                port: Number(process.env.SENTINEL_PORT)
            }] : [],
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            name: 'redis-master',
            password: process.env.REDIS_PASSWORD,
            db: 0
        })
    }

    return redis
}
