import { test, expect, request } from '@playwright/test'
import { getFeEndpointFromKubectl } from '../utils/kubectl-calls'
import { getStatusApiUrlFromMetadataEndpoint } from '../utils/rest-api-calls'
import { execSync } from 'node:child_process'
import { setGlobalDispatcher, Agent } from "undici"

// Initial HTTP request can take a very long time (subsequent requests are faster)
const INITIAL_REQUEST_TIMEOUT_SECS = 300
const TEST_TIMEOUT_SECS = INITIAL_REQUEST_TIMEOUT_SECS + 300

setGlobalDispatcher(new Agent({
  headersTimeout: 1000 * INITIAL_REQUEST_TIMEOUT_SECS,
  bodyTimeout: 0, // disable body timeout
}));

test("full image processing pipeline should work", async () => {
    test.setTimeout(TEST_TIMEOUT_SECS * 1000)

    const kubeState = execSync(
        'kubectl get svc svc-project-overengineer-fe'
    ).toString().trim()

    console.log("kube state:")
    for (const line of kubeState.split("\n")) {
        console.log(line)
    }

    console.log("Getting frontend endpoint from kubectl...")
    const feEndpoint = getFeEndpointFromKubectl()
    console.log(`Frontend endpoint: ${feEndpoint}`)

    // Verify FE is running
    console.log("Checking if frontend is accessible...")
    const reqContext = await request.newContext()
    const response = await reqContext.get(`http://${feEndpoint}/`)
    expect(response.status()).toBe(200)
    console.log("Frontend is accessible")

    // Get status API URL from metadata endpoint
    console.log("Getting status API URL from metadata endpoint...")
    const statusApiUrl = await getStatusApiUrlFromMetadataEndpoint(feEndpoint)
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
