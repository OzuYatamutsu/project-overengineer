import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import { MAX_FILE_SIZE_MB } from '@project-overengineer/shared-lib/constants'
import { Job } from '@project-overengineer/shared-lib/job'
import { JobStatus } from '@project-overengineer/shared-lib/job-status'
import { getRedis } from '@project-overengineer/shared-lib/redis'

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
    job.status = JobStatus.WAITING
    await getRedis().hset(`job:${job.id}`, job.serialize())
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback: Node.js runtime only (not Edge runtime)
  const socketIp = (req as any).socket?.remoteAddress;
  if (socketIp) {
    return socketIp;
  }

  console.log("warning, unable to get client IP, returning unknown")
  return "unknown";
}