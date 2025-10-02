import { getRedis } from './redis'

export async function rateLimit(serviceName: string,
    ip: string,
    maxConnections: number,
    withinSec: number): Promise<boolean> {
        const keyName = `ratelimit:${ip}`
        const count: number = await getRedis(serviceName).incr(keyName);
        if (count === 1) {
            await getRedis(serviceName).expire(keyName, withinSec)
        }
        return count <= maxConnections
}
