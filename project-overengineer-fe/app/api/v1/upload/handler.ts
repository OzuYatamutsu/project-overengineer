'use server'

import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import { Job } from '@project-overengineer/shared-lib/job'
import { JobStatus } from '@project-overengineer/shared-lib/job-status'
import { getRedis } from '@project-overengineer/shared-lib/redis'
import { updateEnvFromVault, watchAndUpdateVaultValue } from '@project-overengineer/shared-lib/vault'
import { log } from '@project-overengineer/shared-lib/logging'
import { MAX_FILE_SIZE_MB } from '@project-overengineer/shared-lib/constants'

import { IncomingMessage } from 'http'

const MAX_DIMENSIONS_X_PX = 1000
const MAX_DIMENSIONS_Y_PX = 1000
const IMAGE_QUALITY_PERCENT = 100
let _vault_inited = false

function _init_vault_if_required(): void {
    if (_vault_inited) return

    log("project-overengineer-fe", "startup: pulling fresh config values...")
    updateEnvFromVault("project-overengineer-fe", "REDIS_HOST")
    updateEnvFromVault("project-overengineer-fe", "REDIS_PORT")
    updateEnvFromVault("project-overengineer-fe", "REDIS_PASSWORD")
    watchAndUpdateVaultValue("project-overengineer-fe", "REDIS_HOST")
    watchAndUpdateVaultValue("project-overengineer-fe", "REDIS_PORT")
    watchAndUpdateVaultValue("project-overengineer-fe", "REDIS_PASSWORD")
    log("project-overengineer-fe", "startup: config values updated.")

    _vault_inited = true
}

export async function validateImage(rawImageData: ArrayBuffer): Promise<boolean> {
    const fileType = await fileTypeFromBuffer(rawImageData)

    return (
        (fileType?.mime?.startsWith('image/') ?? false)
        && (rawImageData.byteLength / 1024 / 1024) <= MAX_FILE_SIZE_MB
    )
}

export async function standardizeImage(rawImageData: Buffer<ArrayBuffer>): Promise<string> {
    const convertedImageData = await sharp(rawImageData)
        .resize(
            MAX_DIMENSIONS_X_PX, MAX_DIMENSIONS_Y_PX,
            { fit: 'inside', withoutEnlargement: true }
        )
        .jpeg({ quality: IMAGE_QUALITY_PERCENT })
        .toBuffer()
    
    return convertedImageData.toString('base64')
}

export async function saveJob(job: Job): Promise<void> {
    _init_vault_if_required()

    job.status = JobStatus.WAITING
    await getRedis("project-overengineer-fe").hset(`job:${job.id}`, job.serialize())
}

export async function getClientIp(req: Request): Promise<string> {
    const forwardedFor = req.headers.get("x-forwarded-for")
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim()
    }

    const realIp = req.headers.get("x-real-ip");
    if (realIp) {
        return realIp
    }

    const cfConnectingIp = req.headers.get("cf-connecting-ip")
    if (cfConnectingIp) {
        return cfConnectingIp
    }

    // Fallback: Node.js runtime only (not Edge runtime)
    const socketIp = (req as unknown as IncomingMessage).socket?.remoteAddress
    if (socketIp) {
        return socketIp
    }

  log("project-overengineer-fe", "warning, unable to get client IP, returning unknown")
  return "unknown"
}