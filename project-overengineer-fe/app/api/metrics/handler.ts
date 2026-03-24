import {
    registerGauge, registerCounter, startHostTelemetryJob,
    register, log, Counter, Gauge 
} from '@project-overengineer/shared-lib'

let successfulJobCounter: Counter
let heartbeatGauge: Gauge
let errorCounter: Counter

export function registerMetrics(): void {
    // metrics endpoint
    log("project-overengineer-fe", `job="startup"`, `registering metrics`)
    successfulJobCounter = registerCounter("successful_jobs_total", "Total number of jobs successfully processed")
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

export function getRegister(): typeof register {
    return register
}
