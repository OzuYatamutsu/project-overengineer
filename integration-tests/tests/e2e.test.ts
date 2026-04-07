import { test, expect, request } from '@playwright/test'
import { getFeEndpointFromKubectl, getStatusApiEndpointFromKubectl } from '../utils/kubectl-calls'
import { getJwtForTestImage, postImageAgainstUploadEndpoint } from '../utils/rest-api-calls'
import { execSync } from 'node:child_process'
import { setGlobalDispatcher, Agent } from "undici"
import { promises as fs } from "fs"
import { monitorJobStatus } from '../utils/ws-calls'


const TEST_IMAGE_RELATIVE_PATH = "../dummy_receipt.jpg"
const EXPECTED_STRINGS = [
    "Oracabessa", "20.50",
    "Kissy Suzuki", "20.50",
    "Martinez Dukes Style", "20.50",
    "50ml Hibiki 17yr", "26.00",
    "Service Charge", "10.94",
    "98.44"
]

// Initial HTTP request can take a very long time (subsequent requests are faster)
const INITIAL_REQUEST_TIMEOUT_SECS = 600

// The test timeout itself is very long due to OCR.
const TEST_TIMEOUT_SECS = INITIAL_REQUEST_TIMEOUT_SECS + 1200

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
    const feEndpoint = `http://${getFeEndpointFromKubectl()}`
    console.log(`Frontend endpoint: ${feEndpoint}`)

    console.log("Getting status API URL from kubectl...")
    const statusApiUrl = `ws://${getStatusApiEndpointFromKubectl()}`
    console.log(`Status API endpoint: ${statusApiUrl}`)

    // Verify FE is running
    console.log("Checking if frontend is accessible...")
    const reqContext = await request.newContext()
    const response = await reqContext.get(`${feEndpoint}/`)
    expect(response.status()).toBe(200)
    console.log("Frontend is accessible")

    // Submit an image for processing
    console.log("Submitting test image for processing...")
    const jobId = await postImageAgainstUploadEndpoint(feEndpoint, await fs.readFile(TEST_IMAGE_RELATIVE_PATH))
    console.log(`Image submitted, job ID: ${jobId}`)

    // Get JWT
    console.log("Getting JWT for test image...")
    const jwt = await getJwtForTestImage(feEndpoint, jobId, await fs.readFile(TEST_IMAGE_RELATIVE_PATH))
    console.log(`JWT for test image: ${jwt}`)

    // Open websocket connection to status API and wait for job completion
    console.log("Opening websocket connection to status API and monitoring job processing...")
    const result = await monitorJobStatus(statusApiUrl, jobId, jwt)
    console.log(`Job completed, result:`)
    for (const line of result.split("\n")) {
        console.log(line)
    }

    // Verify the processed image can be retrieved and is correct
    console.log("Verifying job result")
    for (const expected of EXPECTED_STRINGS) {
        expect(result).toContain(expected)
    }
    console.log("Job result verified successfully")
})
