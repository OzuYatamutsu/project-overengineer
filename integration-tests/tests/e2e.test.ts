import { test, expect, request } from '@playwright/test'
import { getFeEndpointFromKubectl } from '../utils/kubectl-calls'

test("full image processing pipeline should work", async () => {
    console.log("Getting frontend endpoint from kubectl...")
    const feEndpoint = getFeEndpointFromKubectl()
    console.log(`Frontend endpoint: ${feEndpoint}`)

    // Verify FE is running
    console.log("Checking if frontend is accessible...")
    let reqContext = await request.newContext()
    let response = await reqContext.get(`${feEndpoint}/`)
    expect(response.status()).toBe(200)
    console.log("Frontend is accessible")

    // Get status API URL from metadata endpoint
    console.log("Checking if metadata endpoint is accessible...")
    reqContext = await request.newContext()
    response = await reqContext.get(`${feEndpoint}/api/v1/metadata`)
    expect(response.status()).toBe(200)
    console.log("Metadata endpoint is accessible")
    const statusApiUrl = (await response.json()).statusApiUrl
    console.log(`Status API endpoint: ${statusApiUrl}`)

    // Submit an image for processing
    console.log("Submitting test image for processing...")
    console.log("TODO: implement image upload test")

    // Open websocket connection to status API and wait for job completion
    console.log("Opening websocket connection to status API and monitoring job processing...")
    console.log("TODO: implement image processing test")

    // Verify the processed image can be retrieved and is correct
    console.log("Verifying job result")
    console.log("TODO: implement processed image verification")

    expect(true).toBeTruthy()  // TODO: implement actual tests
})
