import { registerCounter, startMetricsServer } from '../metrics'
import { test, expect } from '@playwright/test'

test('can register a counter', () => {
  const counter = registerCounter(`test_counter_${Date.now()}`, "A test counter", ["label1"])
  expect(counter).toBeDefined()
  expect(() => counter.inc({"label1": "value1"})).not.toThrow()
})
test('can start the metrics server', () => {
  expect(() => startMetricsServer(3000)).not.toThrow()
})