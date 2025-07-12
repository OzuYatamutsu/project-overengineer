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

  serialize(): string {
    return JSON.stringify({
      jobId: this.jobId,
      status: this.status,
      result: this.result,
    });
  }
}
