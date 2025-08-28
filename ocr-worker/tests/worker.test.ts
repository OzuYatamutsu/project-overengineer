import { Job } from '@project-overengineer/shared-lib/job'
import { JobStatus } from '@project-overengineer/shared-lib'
import { processJob } from '../worker'
import { test, expect } from '@playwright/test'
import { promises as fs } from 'fs'
import path from "path"

const EXPECTED_STRINGS = [
    "Latte Macchiato", "9.00",
    "Gloki", "5.00",
    "Schweinschnitzel", "22.00",
    "Chässpätzli", "18.50",
    "54.50"
]

test('ocr parses expected text from test image', async () => {
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
