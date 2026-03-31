import { initTracing, shutdownTracing, getTracer } from '../tracing'
import { test, expect } from '@playwright/test'

test('can init and shutdown tracing', async () => {
    await initTracing()
    await shutdownTracing()
    expect(true).toBeTruthy()
})

test('can get tracer', async () => {
    await initTracing()
    const tracer = getTracer('shared-lib')
    expect(tracer).toBeDefined()
    await shutdownTracing()
})
