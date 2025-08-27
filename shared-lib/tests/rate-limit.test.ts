import { rateLimit } from '../rate-limit'
import { test, expect } from '@playwright/test'
const TEST_IP = '127.0.0.1'

test('jobs arent rate limited when they shouldnt be', () => {
  const MAX_CONNECTIONS = 5
  const WITHIN_SECS = 300

  for (let i = 0; i < MAX_CONNECTIONS; i++) {
    expect(rateLimit(TEST_IP, MAX_CONNECTIONS, WITHIN_SECS)).toBeTruthy()
  }
})
test('jobs are rate limited when they should be', () => {
  const MAX_CONNECTIONS = 5
  const WITHIN_SECS = 300

  for (let i = 0; i < MAX_CONNECTIONS; i++) {
    expect(rateLimit(TEST_IP, MAX_CONNECTIONS, WITHIN_SECS)).toBeTruthy()
  }
  for (let i = 0; i < MAX_CONNECTIONS; i++) {
    expect(rateLimit(TEST_IP, MAX_CONNECTIONS, WITHIN_SECS)).toBeFalsy()
  }
})