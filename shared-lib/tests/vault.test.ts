import { test, expect } from '@playwright/test'
import { updateEnvFromVault, getVault, watchAndUpdateVaultValue, getValue, writeValue, CONFIG_PREFIX } from '../vault'

test('can get a vault object', async () => {
  expect(await getVault("shared-lib", true)).toBeTruthy()
})

test('can write a value to vault', async () => {
  const configKey = "_TEST_CONFIG_VALUE1"
  const value = "VALUE"

  await writeValue("shared-lib", configKey, value, true)
  expect(true).toBeTruthy()
})

test('can get a value from vault', async () => {
  const configKey = "_TEST_CONFIG_VALUE2"
  const value = "VALUE"

  await writeValue("shared-lib", configKey, value, true)

  const valueFromVault = await getValue("shared-lib", configKey, true)
  expect(valueFromVault).toBe(value)
})

test('can update an env from vault', async () => {
  const initialValue = "VALUE1"
  const expectedValue = "VALUE2"
  const configKey = "_TEST_CONFIG_VALUE3"
  const vaultClient = await getVault("shared-lib")

  process.env[configKey] = initialValue

  expect(process.env[configKey]).toBeTruthy()
  expect(process.env[configKey]).toBe(initialValue)

  await writeValue("shared-lib", configKey, expectedValue, true)
  updateEnvFromVault("shared-lib", configKey, true)

  expect(process.env[configKey]).toBeTruthy()
  expect(process.env[configKey]).toBe(expectedValue)
})

test('can start watching and updating a value from vault', () => {
  // Just test if we can create a background job
  expect(watchAndUpdateVaultValue("shared-lib", "_TEST_CONFIG_VALUE", true)).toBeTruthy()
})
