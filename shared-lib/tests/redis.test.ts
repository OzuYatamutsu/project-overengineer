import { getRedis } from '../redis'
import { test, expect } from '@playwright/test'

test('can get a redis object', () => {
  expect(getRedis("shared-lib").ping()).toBeTruthy()
})