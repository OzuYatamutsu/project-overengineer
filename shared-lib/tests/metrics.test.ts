import { registerCounter, registerGauge, startMetricsServer } from '../metrics'
import { test, expect } from '@playwright/test'

test('can register a counter', () => {
  const counter = registerCounter(`test_counter_${Date.now()}`, "A test counter", ["label1"])
  expect(counter).toBeDefined()
  expect(() => counter.inc({"label1": "value1"})).not.toThrow()
})
test('can register a gauge', () => {
  const gauge = registerGauge(`test_gauge_${Date.now()}`, "A test gauge", ["label1"])
  expect(gauge).toBeDefined()
  expect(() => gauge.set({"label1": "value1"}, 42)).not.toThrow()
})
test('can add metrics route to an express server', () => {
  const express = require('express')
  const app = express()
  expect(() => startMetricsServer(3000)).not.toThrow()
})
test('can start the metrics server', () => {
  expect(() => startMetricsServer(3000)).not.toThrow()
})