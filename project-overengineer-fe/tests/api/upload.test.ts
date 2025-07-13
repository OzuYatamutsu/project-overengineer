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

    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('jobId')
    expect(typeof data.jobId).toBe('string')
  })
})