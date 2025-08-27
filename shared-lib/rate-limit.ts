import { getRedis } from './redis'

export async function rateLimit(ip: string,
    maxConnections: number,
    withinSec: number): Promise<boolean> {
        const keyName = `ratelimit:${ip}`
        const count: number = await getRedis().incr(keyName);
        if (count === 1) {
            await getRedis().expire(keyName, withinSec)
        }
        return count <= maxConnections
}
