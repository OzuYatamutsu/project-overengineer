import { NodeSDK } from "@opentelemetry/sdk-node"
import { trace, Tracer } from "@opentelemetry/api"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"

const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
})

let sdk: NodeSDK

export async function initTracing(): Promise<void> {
    sdk = new NodeSDK({
        traceExporter,
        instrumentations: [getNodeAutoInstrumentations()],
    })
    await sdk.start()
}

export function getTracer(serviceName: string): Tracer {
    return trace.getTracer(serviceName)
}

export async function shutdownTracing(): Promise<void> {
    await sdk.shutdown()
}

export type { Tracer } from "@opentelemetry/api"
