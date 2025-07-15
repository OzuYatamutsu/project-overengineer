export enum JobStatus {
    NEW = "NEW",
    WAITING = "WAITING",
    PROCESSING = "PROCESSING",
    DONE = "DONE"
}

export class JobUpdate {
  constructor(
    public jobId: string,
    public status: JobStatus,
    public result: string
  ) {}

  static fromJsonString(jsonString: string): JobUpdate {
    const jsonObject = JSON.parse(jsonString)
    return new JobUpdate(
      jsonObject.jobId,
      jsonObject.status,
      jsonObject.result
    )
  }

  serialize(): string {
    return JSON.stringify({
      jobId: this.jobId,
      status: this.status,
      result: this.result,
    });
  }
}
