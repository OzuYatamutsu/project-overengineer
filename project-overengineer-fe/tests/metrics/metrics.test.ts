import { test, expect, request } from '@playwright/test'

test.describe('Metrics API', () => {
    test('should return 200 OK for /metrics', async ({ baseURL }) => {
        const reqContext = await request.newContext()
        const response = await reqContext.get(`${baseURL}/metrics`)

        expect(response.status()).toBe(200)
    })
})