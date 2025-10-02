'use server'

import { NextResponse } from 'next/server'
import { Job } from '@project-overengineer/shared-lib/job'
import { rateLimit } from '@project-overengineer/shared-lib/rate-limit'
import { log } from '@project-overengineer/shared-lib/logging'
import { standarizeImage, validateImage, saveJob, getClientIp } from './handler'

// Max 1 request per sec
const MAX_REQUESTS = 60
const PER_SECS = 60

export async function POST(request: Request): Promise<NextResponse> {
  const ip = await getClientIp(request)
  if (!rateLimit("project-overengineer-fe", ip, MAX_REQUESTS, PER_SECS)) {
    log("project-overengineer-fe", `rejecting request from ${ip}, rate limit exceeded`)
    return NextResponse.json({
      message: 'Rate limit exceeded',
      jobId: "",
    }, {
      status: 429
    })
  }

  log("project-overengineer-fe", `Processing new request...`)
  const contentType = request.headers.get('content-type')

  if (!contentType?.startsWith('image/')) {
    log("project-overengineer-fe", `Rejected request (failed validation)`)

    return NextResponse.json({
      message: 'Unsupported content type',
      jobId: "",
    }, {
      status: 400
    })
  }

  const rawImageData = await request.arrayBuffer()

  // Validate length and type
  if (!(await validateImage(rawImageData))) {
    log("project-overengineer-fe", `Rejected request (failed validation)`)
  
    return NextResponse.json({
      message: "Image failed validation (size or file format)",
      jobId: ""
    }, {
      status: 400
    })
  }

  // Convert and standardize image format
  const imageData = await standarizeImage(
    Buffer.from(rawImageData)
  )

  // Create job
  const job = new Job(imageData)
  log("project-overengineer-fe", `Request was upgraded to a job with ID: ${job.id}`)

  // Commit job
  try {
    await saveJob(job)
  } catch (error) {
    console.error(`Error saving job to Redis: ${error}`)
    return NextResponse.json({
      message: `Failed to create job. Error: ${error}`,
      jobId: job.id
    }, {
      status: 500
    })
  }

  return NextResponse.json({
    message: "Job created",
    jobId: job.id
  }, {
    status: 201
  })
}
