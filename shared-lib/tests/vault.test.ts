import { test, expect } from '@playwright/test'
import { updateEnvFromVault, getVault, watchAndUpdateVaultValue, CONFIG_PREFIX } from '../vault'

test('can get a vault object', async () => {
  expect(await getVault("shared-lib")).toBeTruthy()
})

test('can update an env from vault', async () => {
  const initialValue = "VALUE1"
  const expectedValue = "VALUE2"
  const configKey = "_TEST_CONFIG_VALUE"
  const vaultClient = await getVault("shared-lib")

  process.env[configKey] = initialValue

  expect(process.env[configKey]).toBeTruthy()
  expect(process.env[configKey]).toBe(initialValue)

  await vaultClient.write(`${CONFIG_PREFIX}/${configKey}`, expectedValue)
  updateEnvFromVault("shared-lib", configKey)

  expect(process.env[configKey]).toBeTruthy()
  expect(process.env[configKey]).toBe(expectedValue)
})

test('can start watching and updating a value from vault', () => {
  // Just test if we can create a background job
  expect(watchAndUpdateVaultValue("shared-lib", "_TEST_CONFIG_VALUE")).toBeTruthy()
})
