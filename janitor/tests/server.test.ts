import { jobIsStale, _healthz, JOB_TTL_SECS } from '../worker'
import { test, expect } from '@playwright/test'
const TEST_JOB_ID = '7f8e21a8-40b9-42a6-9143-d769f8295a3a'

test('janitor should remove stale jobs', async () => {
  const staleJobUtime = (new Date().getTime() / 1000) - JOB_TTL_SECS - 1
  expect(jobIsStale(TEST_JOB_ID, staleJobUtime)).toBe(true)
})
test('janitor should not remove non-stale jobs', async () => {
  const nonStaleJobTime = (new Date().getTime() / 1000)
  expect(jobIsStale(TEST_JOB_ID, nonStaleJobTime)).toBe(false)
})
test('janitor healthz endpoint should be working', async () => {
  expect(await _healthz()).toBe(true)
})
