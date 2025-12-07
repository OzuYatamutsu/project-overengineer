import { test, expect } from '@playwright/test'
import { updateEnvFromVault, getVault, watchAndUpdateVaultValue,
  getValue, writeValue, pullAndWatchVaultConfigValues,
  getImageEncryptionKey, generateJwt, verifyJwt } from '../vault'
import { randomUUID } from 'crypto'

test.beforeAll(async () => {
  // Init transit engine and insert jwt signing key
  await (await (await getVault("shared-lib", true)).request({
    method: "POST",
    path: "/sys/mounts/transit",
    json: {
      type: "transit",
    },
  }))
  await (await getVault("shared-lib", true)).write("transit/keys/jwt-signer", {
    type: "ed25519"
  })
})
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

  process.env[configKey] = initialValue

  expect(process.env[configKey]).toBeTruthy()
  expect(process.env[configKey]).toBe(initialValue)

  await writeValue("shared-lib", configKey, expectedValue, true)
  await updateEnvFromVault("shared-lib", configKey, true)

  expect(process.env[configKey]).toBeTruthy()
  expect(process.env[configKey]).toBe(expectedValue)
})
test('can start watching and updating a value from vault', () => {
  // Just test if we can create a background job
  expect(watchAndUpdateVaultValue("shared-lib", "_TEST_CONFIG_VALUE", 60000, true)).toBeTruthy()
})
test('can pull the image encryption key', async () => {
  await writeValue("shared-lib", "IMAGE_KEY", crypto.randomUUID(), true)
  expect(await getImageEncryptionKey("shared-lib", true)).toBeTruthy()
})
test('can connect and pull default config values on start', async () => {
  await writeValue("shared-lib", "REDIS_HOST", process.env["REDIS_HOST"] || "DUMMY_VALUE", true)
  await writeValue("shared-lib", "REDIS_PORT", process.env["REDIS_PORT"] || "DUMMY_VALUE", true)
  await writeValue("shared-lib", "REDIS_PASSWORD", process.env["REDIS_PASSWORD"] || "DUMMY_VALUE", true)

  const bgJobs = await pullAndWatchVaultConfigValues("shared-lib", true)
  expect(true).toBeTruthy()
  bgJobs.forEach((jobId) => clearInterval(jobId))
})
test('can generate a jwt from vault', async () => {
  const testJobId = randomUUID()
  const jwt = await generateJwt("shared-lib", testJobId, true)
  expect(jwt).toBeTruthy()
})
test('can verify a jwt from vault', async () => {
  const testJobId = randomUUID()
  const jwt = await generateJwt("shared-lib", testJobId, true)
  expect(verifyJwt("shared-lib", jwt, testJobId, true)).toBe(true)
})
test('will reject a faulty jwt from vault due to incorrect job id', async () => {
  const testJobId = randomUUID()
  const faultyJobId = randomUUID()
  const jwt = await generateJwt("shared-lib", testJobId, true)

  expect(jwt).toBeTruthy()
  expect(verifyJwt("shared-lib", jwt, faultyJobId, true)).toBe(false)
})
test('will reject a faulty jwt from vault due to incorrect signature', async () => {
  const testJobId = randomUUID()
  let jwt = await generateJwt("shared-lib", testJobId, true)
  const signature = Buffer.from(jwt.split(".")[2], "base64url").toString("utf8")
  jwt = jwt.replace(jwt.split(".")[2], Buffer.from(signature + "BAD").toString("base64url"))

  expect(jwt).toBeTruthy()
  expect(verifyJwt("shared-lib", jwt, testJobId, true)).toBe(false)
})