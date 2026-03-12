import client from "prom-client"
import express from "express"
import type { Request, Response } from "express"
const metricsServer = express()
const register = new client.Registry()

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

export type Gauge = client.Gauge
export type Counter = client.Counter
