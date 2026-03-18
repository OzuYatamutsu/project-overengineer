import client from "prom-client"
import express from "express"
import type { Request, Response } from "express"
import os from "os"
const metricsServer = express()
const register = new client.Registry()
const TELEMETRY_JOB_INTERVAL_MSECS = 20000
var cpuUsageGauge: Gauge
var memUsageGauge: Gauge

client.collectDefaultMetrics({ register })

metricsServer.get("/metrics", async (_: Request, res: Response): Promise<void> => {
    res.set("Content-Type", register.contentType)
    res.end(await register.metrics())
})

export function registerCounter(name: string, help: string, labelNames: string[] = []): client.Counter {
    const counter = new client.Counter({
        "name": name,
        "help": help,
        "labelNames": labelNames
    })
    register.registerMetric(counter)
    return counter
}

export function registerGauge(name: string, help: string, labelNames: string[] = []): client.Gauge {
    const gauge = new client.Gauge({
        "name": name,
        "help": help,
        "labelNames": labelNames
    })
    register.registerMetric(gauge)
    return gauge
}

export function startMetricsServer(port: number): void {
    metricsServer.listen(port, () => {
        console.log(`Metrics server is running on port ${port}`)
    })
}

export function startHostTelemetryJob(): void {
    if (!cpuUsageGauge) {
        cpuUsageGauge = registerGauge("cpu_usage_percent", "Host CPU usage in percentage")
    }
    if (!memUsageGauge) {
        memUsageGauge = registerGauge("mem_usage_percent", "Host memory usage in percentage")
    }
    setInterval(() => {
        const cpuUsage = os.loadavg()[0] / os.cpus().length * 100
        const memUsage = (1 - os.freemem() / os.totalmem()) * 100
        cpuUsageGauge.set(cpuUsage)
        memUsageGauge.set(memUsage)
    }, TELEMETRY_JOB_INTERVAL_MSECS)
}

export type Gauge = client.Gauge
export type Counter = client.Counter
