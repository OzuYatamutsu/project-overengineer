import { v4 as uuidv4 } from 'uuid'
import { JobStatus } from './job-status'

export class Job {
    public id: string
    public status: JobStatus
    public imageDataBase64: string

    constructor(imageDataBase64: string) {
        this.id = uuidv4()
        this.status = JobStatus.NEW
        this.imageDataBase64 = imageDataBase64
    }

    static fromRedisObject(redisObject: Record<string, string>): Job {
        let job = new Job(redisObject.imageDataBase64)
        job.id = redisObject.id
        job.status = redisObject.status as JobStatus

        return job
    }
}
