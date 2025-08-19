import Redis from "ioredis";
import { enforceConfig } from "./verify";

let redis: Redis

const REDIS_CONSUMER_GROUP_NAME = "jobs_group"

export function getRedis(enforceConsumerGroup=true): Redis {
    enforceConfig("REDIS_HOST")
    enforceConfig("REDIS_PORT")
    enforceConfig("REDIS_PASSWORD")

    if (!redis) {
        console.log(
            `Opening new Redis connection (primary=${process.env.REDIS_HOST}:${process.env.REDIS_PORT}, sentinel(s): `
            + (
                !!process.env.SENTINEL_HOST 
                ? process.env.SENTINEL_HOST + ":" + process.env.SENTINEL_PORT 
                : "no"
                )
            + ")"
        )

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

export async function createConsumerGroupIfNotExists(key: string): Promise<void> {
    console.log("Creating new consumer group (if not exists)...")
    await getRedis().xgroup("CREATE", key, REDIS_CONSUMER_GROUP_NAME, 0, "MKSTREAM")
}
