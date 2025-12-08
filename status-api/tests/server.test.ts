import { JobUpdate } from '@project-overengineer/shared-lib/job-status'
import { getVault, generateJwt } from '@project-overengineer/shared-lib/vault'
import { test, expect } from '@playwright/test'
import { WebSocket, RawData } from 'ws'
import { _healthz, port } from '../server';

test.beforeAll(async () => {
  // Init transit engine and insert jwt signing key
  try {
    await (await (await getVault("status-api", true)).request({
      method: "POST",
      path: "/sys/mounts/transit",
      json: {
        type: "transit",
      },
    }))
  } catch (err) {
    if (!String(err).includes("path is already in use")) {
      throw(err)
    }
  }
  await (await getVault("status-api", true)).write("transit/keys/jwt-signer", {
    type: "ed25519"
  })
})
test('WebSocket API should respond to queries for job status', async () => {
  const jobId = '2cfdbca8-245d-4fe1-a3f5-b4dffe0a8a6b'
  const jwt = await generateJwt("status-api", jobId, true)
  const messages: JobUpdate[] = []
  const ws = new WebSocket(`ws://localhost:${port}`)
  
  // Send dummy job to ws server
  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({
        job: {jobId: jobId},
        jwt: jwt
      }))
    })

    ws.on('message', (data: RawData) => {
      const msg = JobUpdate.fromJsonString(data.toString())
      messages.push(msg)

      // In actual code, we'd close the connection if status is JobStatus.DONE
      // But here, we're just checking if we can receive messages at all
      ws.close()
    })

    ws.on('close', () => resolve())
    ws.on('error', (err: Error) => reject(err))
  })

  // We should receive at least one message, which should
  // have all required fields filled in.
  expect(messages.length).toBeGreaterThan(0)
  for (let message of messages) {
    expect(message.jobId).toEqual(jobId)
    expect(message.status).toBeTruthy()
  }
})
test('status-api healthz endpoint should be working', async () => {
  expect(await _healthz()).toBe(true)
})
