import { Job } from '@project-overengineer/shared-lib/job'
import { JobStatus } from '@project-overengineer/shared-lib'
import { processJob } from '../worker'
import { test, expect } from '@playwright/test'
import { promises as fs } from 'fs'
import { setGlobalDispatcher, Agent } from "undici";
import path from "path"

// The test is very long, up to 20 minutes.
const TEST_TIMEOUT_SECS = 1200

const EXPECTED_STRINGS = [
    "Oracabessa", "20.50",
    "Kissy Suzuki", "20.50",
    "Martinez Dukes Style", "20.50",
    "50ml Hibiki 17yr", "26.00",
    "Service Charge", "10.94",
    "98.44"
]

// So we need to override the default timeout for fetch.
setGlobalDispatcher(new Agent({
  headersTimeout: 1000 * TEST_TIMEOUT_SECS,
  bodyTimeout: 0, // disable body timeout
}));

test('ocr parses expected text from test image', async () => {
    test.setTimeout(TEST_TIMEOUT_SECS * 1000)

    let testJob = new Job(
        await fs.readFile(path.join(__dirname, "test-image.base64"), "utf-8"))
    testJob.status = JobStatus.PROCESSING
    testJob = await processJob(testJob)

    // debug
    console.log("")
    console.log("[OCR result]")
    console.log("")
    testJob.result.split("\n").forEach(line => console.log(line))

    // We should expect to find all the expected strings within the result
    for (let i = 0; i < EXPECTED_STRINGS.length; i++) {
        expect(testJob.result).toContain(EXPECTED_STRINGS[i])
    }

    expect(testJob.status === JobStatus.DONE)
})
