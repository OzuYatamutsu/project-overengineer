import { v4 as uuidv4 } from 'uuid'
import CryptoJS from 'crypto-js'
import { JobStatus } from './job-status'

const _encryptMagicString = 'U2F'

export class Job {
    public id: string
    public status: JobStatus
    public imageDataBase64: string
    public result: string
    public createUtime: number
    public progress: number
    public isEncrypted: boolean

    constructor(imageDataBase64: string) {
        this.id = uuidv4()
        this.status = JobStatus.NEW
        this.imageDataBase64 = imageDataBase64
        this.result = ""
        this.createUtime = (new Date()).getTime() / 1000
        this.progress = 0
        this.isEncrypted = false
    }

    encrypt(key: string): void {
        if (this.isEncrypted) return;

        this.imageDataBase64 = CryptoJS.AES.encrypt(
            this.imageDataBase64, key
        ).toString()

        this.isEncrypted = true
    }

    decrypt(key: string): void {
        if (!this.isEncrypted) return;

        this.imageDataBase64 = CryptoJS.AES.decrypt(
            this.imageDataBase64, key
        ).toString(CryptoJS.enc.Utf8)

        this.isEncrypted = false
    }

    static fromRedisObject(redisObject: Record<string, string>): Job {
        const job = new Job(redisObject.imageDataBase64)
        job.id = redisObject.id
        job.status = redisObject.status as JobStatus
        job.createUtime = Number(redisObject.createUtime)
        job.progress = Number(redisObject.progress)
        job.isEncrypted = redisObject.imageDataBase64.startsWith(_encryptMagicString)

        return job
    }

    serialize(): Record<string, string> {
        return {
            id: this.id,
            status: this.status.toString(),
            imageDataBase64: this.imageDataBase64,
            result: this.result,
            createUtime: this.createUtime.toString(),
            progress: this.progress.toString(),
        }
    }
}
