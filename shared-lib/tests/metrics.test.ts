import { registerCounter, startMetricsServer } from '../metrics'
import { test, expect } from '@playwright/test'

test('can register a counter', () => {
  expect(() => registerCounter(`test_counter_${Date.now()}`, "A test counter")).not.toThrow()
})
test('can start the metrics server', () => {
  expect(() => startMetricsServer(3000)).not.toThrow()
})