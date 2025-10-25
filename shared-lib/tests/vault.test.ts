import { test, expect } from '@playwright/test'
import { getValueFromVault, getVault, watchAndUpdateVaultValue } from '../vault'

test('can get a vault object', () => {
  expect(getVault("shared-lib")).toBeTruthy()
})

test('can get a value from vault', () => {
  expect(getValueFromVault("shared-lib", "_TEST_CONFIG_VALUE")).toBeTruthy()
})

test('can start watching and updating a value from vault', () => {
  expect(watchAndUpdateVaultValue("shared-lib", "_TEST_CONFIG_VALUE")).toBeTruthy()
})
