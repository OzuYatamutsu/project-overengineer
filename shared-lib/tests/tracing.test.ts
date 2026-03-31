import { initTracing, shutdownTracing } from '../tracing'
import { test, expect } from '@playwright/test'

test('can init and shutdown tracing', async () => {
    await initTracing()
    await shutdownTracing()
    expect(true).toBeTruthy()
})
