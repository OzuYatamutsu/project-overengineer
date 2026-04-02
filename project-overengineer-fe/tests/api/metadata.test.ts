import { test, expect, request } from '@playwright/test'

test.describe('Metadata API', () => {
    test('should return 200 OK for /api/v1/metadata', async ({ baseURL }) => {
        const reqContext = await request.newContext()
        const response = await reqContext.get(`${baseURL}/api/v1/metadata`)

        expect(response.status()).toBe(200)
    })

    test('should return metadata in JSON format', async ({ baseURL }) => {
        const reqContext = await request.newContext()
        const response = await reqContext.get(`${baseURL}/api/v1/metadata`)

        expect(response.status()).toBe(200)
        const body = await response.json()
        expect(body).toHaveProperty('statusApiUrl')
        expect(body.statusApiUrl).toBeTruthy()
    })
})