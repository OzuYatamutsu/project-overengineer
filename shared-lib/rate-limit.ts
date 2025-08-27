import { getRedis } from './redis'

export async function rateLimit(ip: string,
    maxConnections: number,
    withinSec: number): Promise<boolean> {
        const keyName = `ratelimit:${ip}`
        const transaction = getRedis().multi()

        transaction.incr(keyName)
        transaction.expire(keyName, withinSec)
        
        const [count,] = (await transaction.exec()) as [number, unknown]
        return count <= maxConnections
}
