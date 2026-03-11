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

export function registerCounter(name: string, help: string, labelNames: string[] = []): void {
    const counter = new client.Counter({
        "name": name,
        "help": help,
        "labelNames": labelNames
    })
    register.registerMetric(counter)
}

export function startMetricsServer(port: number): void {
    metricsServer.listen(port, () => {
        console.log(`Metrics server is running on port ${port}`)
    })
}
