import { NodeSDK } from "@opentelemetry/sdk-node"
import { trace, Tracer } from "@opentelemetry/api"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions"

const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4317",
})

let sdk: NodeSDK

export async function initTracing(serviceName: string): Promise<void> {
    sdk = new NodeSDK({
        traceExporter,
        instrumentations: [getNodeAutoInstrumentations()],
        resource: resourceFromAttributes({
            [ATTR_SERVICE_NAME]: serviceName,
        }),
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
export type { Span } from "@opentelemetry/api"