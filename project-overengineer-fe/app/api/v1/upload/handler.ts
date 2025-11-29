'use server'

import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import { Job } from '@project-overengineer/shared-lib/job'
import { JobStatus } from '@project-overengineer/shared-lib/job-status'
import { getRedis } from '@project-overengineer/shared-lib/redis'
import { pullAndWatchVaultConfigValues, getImageEncryptionKey } from '@project-overengineer/shared-lib/vault'
import { log } from '@project-overengineer/shared-lib/logging'
import { MAX_FILE_SIZE_MB } from '@project-overengineer/shared-lib/constants'

import { IncomingMessage } from 'http'

const MAX_DIMENSIONS_X_PX = 1000
const MAX_DIMENSIONS_Y_PX = 1000
const IMAGE_QUALITY_PERCENT = 100
const _IS_UNIT_TESTING = !!process.env["_IS_UNIT_TESTING"]
let _vault_inited = false

async function _init_vault_if_required(): Promise<void> {
    if (_vault_inited) return
    if (_IS_UNIT_TESTING) return

    await pullAndWatchVaultConfigValues("project-overengineer-fe")

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
    await _init_vault_if_required()

    job.status = JobStatus.WAITING
    job.encrypt(await getImageEncryptionKey("project-overengineer-fe"))
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