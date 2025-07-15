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
}
