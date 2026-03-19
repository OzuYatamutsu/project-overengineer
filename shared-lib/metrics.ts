import client from "prom-client"
import express from "express"
import type { Request, Response } from "express"
import os from "os"
import si from "systeminformation"
const metricsServer = express()
const register = new client.Registry()
const TELEMETRY_JOB_INTERVAL_MSECS = 20000
var cpuUsageGauge: Gauge
var memUsageGauge: Gauge
var netRxBytesGauge: Gauge
var netTxBytesGauge: Gauge

client.collectDefaultMetrics({ register })

metricsServer.get("/metrics", async (_: Request, res: Response): Promise<void> => {
    res.set("Content-Type", register.contentType)
    res.end(await register.metrics())
})

export function registerCounter(name: string, help: string, labelNames: string[] = []): client.Counter {
    if (client.register.getSingleMetric(name)) {
        return client.register.getSingleMetric(name) as client.Counter
    }
    const counter = new client.Counter({
        "name": name,
        "help": help,
        "labelNames": labelNames
    })
    register.registerMetric(counter)
    return counter
}

export function registerGauge(name: string, help: string, labelNames: string[] = []): client.Gauge {
    if (client.register.getSingleMetric(name)) {
        return client.register.getSingleMetric(name) as client.Gauge
    }
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
    if (!netRxBytesGauge) {
        netRxBytesGauge = registerGauge("net_rx_bytes", "Host network received bytes")
    }
    if (!netTxBytesGauge) {
        netTxBytesGauge = registerGauge("net_tx_bytes", "Host network transmitted bytes")
    }
    setInterval(async () => {
        const cpuUsage = os.loadavg()[0] / os.cpus().length * 100
        const memUsage = (1 - os.freemem() / os.totalmem()) * 100

        const netStats = await si.networkStats()
        const netRxBytes = netStats.reduce((acc, iface) => acc + iface.rx_bytes, 0)
        const netTxBytes = netStats.reduce((acc, iface) => acc + iface.tx_bytes, 0)
        cpuUsageGauge.set(cpuUsage)
        memUsageGauge.set(memUsage)
        netRxBytesGauge.set(netRxBytes)
        netTxBytesGauge.set(netTxBytes)
    }, TELEMETRY_JOB_INTERVAL_MSECS)
}

export type Gauge = client.Gauge
export type Counter = client.Counter
