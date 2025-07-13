import { test, expect, request } from '@playwright/test'

test.describe('Upload API', () => {
  test('should accept an image upload and return jobId', async ({ baseURL }) => {
    const testImage =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='
    const buffer = Buffer.from(testImage, 'base64')
    const reqContext = await request.newContext()

    const response = await reqContext.post(`${baseURL}/api/v1/upload`, {
      headers: {
        'Content-Type': 'image/png',
      },
      data: buffer,
    })

    expect(response.status()).toBe(201)

    const data = await response.json()
    expect(data).toHaveProperty('jobId')
    expect(typeof data.jobId).toBe('string')
  })

test('should reject something which is not an image', async ({ baseURL }) => {
    const notAnImage = 'bm90LWFuLWltYWdl'
    const buffer = Buffer.from(notAnImage, 'base64')
    const reqContext = await request.newContext()

    const response = await reqContext.post(`${baseURL}/api/v1/upload`, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      data: buffer,
    })

    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data).toHaveProperty('message')
    expect(typeof data.message).toBe('string')
  })
})