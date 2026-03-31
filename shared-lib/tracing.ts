import { NodeSDK } from "@opentelemetry/sdk-node"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"

const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
})

const sdk = new NodeSDK({
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
})

export async function initTracing(): Promise<void> {
    await sdk.start()
}

export async function shutdownTracing(): Promise<void> {
    await sdk.shutdown()
}
