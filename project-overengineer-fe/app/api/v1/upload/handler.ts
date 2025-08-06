import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import { MAX_FILE_SIZE_MB } from '@/lib/constants'
import { Job } from '@/lib/job'
import { Redis } from 'ioredis'
import { JobStatus } from '@/lib/job-status'
import { enforceConfig, enforceRedisReachable } from '@/lib/verify'

const MAX_DIMENSIONS_X_PX = 1000
const MAX_DIMENSIONS_Y_PX = 1000
const IMAGE_QUALITY_PERCENT = 80

enforceConfig("SENTINEL_HOST", true)
enforceConfig("SENTINEL_PORT", true)
enforceConfig("REDIS_PASSWORD", true)
enforceRedisReachable()

export async function validateImage(rawImageData: ArrayBuffer): Promise<boolean> {
    const fileType = await fileTypeFromBuffer(rawImageData)

    return (
        (fileType?.mime?.startsWith('image/') ?? false)
        && (rawImageData.byteLength / 1024 / 1024) <= MAX_FILE_SIZE_MB
    )
}

export async function standarizeImage(rawImageData: Buffer<ArrayBuffer>): Promise<string> {
    const convertedImageData = await sharp(rawImageData)
        .resize(
            MAX_DIMENSIONS_X_PX, MAX_DIMENSIONS_Y_PX,
            { fit: 'inside', withoutEnlargement: true }
        )
        .jpeg({ quality: IMAGE_QUALITY_PERCENT })
        .toBuffer()
    
    return `data:image/jpeg;base64,${convertedImageData.toString('base64')}`
}

export async function saveJob(job: Job): Promise<void> {
    // Connect to Redis
    const redis = new Redis({
        sentinels: [{
            host: process.env.SENTINEL_HOST,
            port: Number(process.env.SENTINEL_PORT)
        }],
        name: 'redis-master',
        password: process.env.REDIS_PASSWORD,
        sentinelPassword: process.env.REDIS_PASSWORD,
        db: 0
    })

    job.status = JobStatus.WAITING
    await redis.hset(`job:${job.id}`, job.serialize())
}