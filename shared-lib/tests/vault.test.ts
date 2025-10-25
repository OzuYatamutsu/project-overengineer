import { test, expect } from '@playwright/test'
import { updateEnvFromVault, getVault, watchAndUpdateVaultValue } from '../vault'

test('can get a vault object', () => {
  expect(getVault("shared-lib")).toBeTruthy()
})

test('can update an env from vault', () => {
  const initialValue = "VALUE1"
  process.env["_TEST_CONFIG_VALUE"] = initialValue

  expect(process.env["_TEST_CONFIG_VALUE"]).toBeTruthy()
  expect(process.env["_TEST_CONFIG_VALUE"]).toBe(initialValue)

  updateEnvFromVault("shared-lib", "_TEST_CONFIG_VALUE")

  expect(process.env["_TEST_CONFIG_VALUE"]).toBeTruthy()
  expect(process.env["_TEST_CONFIG_VALUE"]).not.toBe(initialValue)
})

test('can start watching and updating a value from vault', () => {
  // Just test if we can create a background job
  expect(watchAndUpdateVaultValue("shared-lib", "_TEST_CONFIG_VALUE")).toBeTruthy()
})
