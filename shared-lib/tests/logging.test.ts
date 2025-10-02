import { log } from '../logging'
import { test, expect } from '@playwright/test'

test('can log and annotate the log', () => {
  log("shared-lib", "test message")
  expect(true).toBeTruthy()
})
