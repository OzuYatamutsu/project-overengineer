import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import { MAX_FILE_SIZE_MB } from '@/lib/constants'
import { Job } from '@/lib/job'
import { Redis } from 'ioredis'

const MAX_DIMENSIONS_X_PX = 1000
const MAX_DIMENSIONS_Y_PX = 1000
const IMAGE_QUALITY_PERCENT = 80

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
    // TODO replace this with config management (and rotate dev password)
    const redis = new Redis({
        sentinels: [{
            host: 'redis-sentinel', port: 26379
        }],
        name: 'redis-master',
        password: 'b4yscx92yksfyv9c',
        sentinelPassword: 'b4yscx92yksfyv9c',
        db: 0
    })

    await redis.hset(`job:${job.id}`, job.serialize())
}