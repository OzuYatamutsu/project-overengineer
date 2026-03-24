import {
    registerGauge, registerCounter, startHostTelemetryJob,
    register, log
} from '@project-overengineer/shared-lib'
import type { Gauge, Counter } from '@project-overengineer/shared-lib'
let successfulJobCounter: Counter
let jobDurationMsGauge: Gauge
let heartbeatGauge: Gauge
let errorCounter: Counter

export function registerMetrics(): void {
    // metrics endpoint
    log("project-overengineer-fe", `job="startup"`, `registering metrics`)
    successfulJobCounter = registerCounter("successful_jobs_total", "Total number of jobs successfully processed")
    jobDurationMsGauge = registerGauge("job_duration_ms", "Duration of job processing in milliseconds")
    heartbeatGauge = registerGauge("heartbeat", "Heartbeat gauge to monitor if the worker is alive")
    errorCounter = registerCounter("errors_total", "Total number of unhandled errors", ["method"])

    log("project-overengineer-fe", `job="startup"`, `starting host telemetry job`)
    startHostTelemetryJob()

    heartbeatGauge.set(1)
}

export function incrementErrorCounter(method: string): void {
    errorCounter.inc({ method })
}

export function incrementSuccessfulJobCounter(): void {
    successfulJobCounter.inc()
}

export function observeJobDuration(duration: number): void {
    jobDurationMsGauge.set(duration)
}

export function getRegister(): typeof register {
    return register
}
