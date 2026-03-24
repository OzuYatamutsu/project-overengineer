import { test, expect, request } from '@playwright/test'

test.describe('Metrics API', () => {
    test('should return 200 OK for /api/metrics', async ({ baseURL }) => {
        const reqContext = await request.newContext()
        const response = await reqContext.get(`${baseURL}/api/metrics`)

        expect(response.status()).toBe(200)
    })
})