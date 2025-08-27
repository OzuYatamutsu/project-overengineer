import { enforceConfig } from '../verify'
import { test, expect } from '@playwright/test'
const TEST_CONFIG_KEY = "_UNITTEST_TEST_KEY"
const TEST_CONFIG_KEY_NOT_EXISTS = "_UNITTEST_TEST_KEY_NOT_EXISTS"

test('doesnt throw error if config key defined', () => {
  process.env[TEST_CONFIG_KEY] = "true"
  enforceConfig(TEST_CONFIG_KEY, true)
  expect(true)
})
test('throw error if config key not defined', () => {
  try {
    enforceConfig(TEST_CONFIG_KEY_NOT_EXISTS, true)
    expect(false)
  } catch (Error) {
    expect(true)
  }
})