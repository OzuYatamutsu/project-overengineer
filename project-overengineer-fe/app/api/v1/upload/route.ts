'use server'

import { NextResponse } from 'next/server'
import { Job } from '@project-overengineer/shared-lib/job'
import { rateLimit } from '@project-overengineer/shared-lib/rate-limit'
import { log } from '@project-overengineer/shared-lib/logging'
import { getTracer } from '@project-overengineer/shared-lib/tracing'
import { Span } from '@project-overengineer/shared-lib/tracing'
import { standardizeImage, validateImage, saveJob, getClientIp } from './handler'
import { 
  incrementErrorCounter, incrementSuccessfulJobCounter, observeJobDuration,
  registerMetricsIfRequired
} from '../../metrics/handler'

// Max 1 request per sec
const MAX_REQUESTS = 60
const PER_SECS = 60

export async function POST(request: Request): Promise<NextResponse> {
  await registerMetricsIfRequired()

  let uploadRequestSpan = getTracer("project-overengineer-fe").startSpan("handle_upload_request")
  let childSpan: Span

  const ip = await getClientIp(request)
  uploadRequestSpan.setAttribute("client_ip", ip ?? "unknown")

  if (!rateLimit("project-overengineer-fe", ip, MAX_REQUESTS, PER_SECS)) {
    log("project-overengineer-fe", `endpoint="/upload" ip="${ip}"`, `rejecting request, rate limit exceeded`)
    uploadRequestSpan.addEvent("rate_limit_exceeded")
    uploadRequestSpan.end()

    return NextResponse.json({
      message: 'Rate limit exceeded',
      jobId: "",
    }, {
      status: 429
    })
  }

  childSpan = getTracer("project-overengineer-fe").startSpan("validate_request")
  log("project-overengineer-fe", `endpoint="/upload"`, `Processing new request...`)
  
  const contentType = request.headers.get('content-type')
  var startTime = new Date().getTime()

  if (!contentType?.startsWith('image/')) {
    log("project-overengineer-fe", `endpoint="/upload"`, `Rejected request (failed validation)`)
    uploadRequestSpan.addEvent("unsupported_content_type", { content_type: contentType ?? "unknown" })
    childSpan.addEvent("unsupported_content_type", { content_type: contentType ?? "unknown" })
    childSpan.end()
    uploadRequestSpan.end()

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
    log("project-overengineer-fe", `endpoint="/upload"`, `Rejected request (failed validation)`)
    uploadRequestSpan.addEvent("image_validation_failed")
    childSpan.addEvent("image_validation_failed")
    childSpan.end()
    uploadRequestSpan.end()

    return NextResponse.json({
      message: "Image failed validation (size or file format)",
      jobId: ""
    }, {
      status: 400
    })
  }

  childSpan.end()

  // Convert and standardize image format
  childSpan = getTracer("project-overengineer-fe").startSpan("process_image")
  const imageData = await standardizeImage(
    Buffer.from(rawImageData)
  )
  childSpan.end()

  // Create job
  childSpan = getTracer("project-overengineer-fe").startSpan("save_job")
  const job = new Job(imageData)
  log("project-overengineer-fe", `endpoint="/upload" jobId="${job.id}"`, `Request was upgraded to a job`)

  // Commit job
  try {
    await saveJob(job)
  } catch (error) {
    console.error(`Error saving job to Redis: ${error}`)
    log("project-overengineer-fe", `endpoint="/upload" jobId="${job.id}"`, `Failed to create job. Error: ${error}`)
    incrementErrorCounter("save_job")
    childSpan.addEvent("job_creation_failed")
    childSpan.end()
    uploadRequestSpan.addEvent("job_creation_failed")
    uploadRequestSpan.end()
    
    return NextResponse.json({
      message: `Failed to create job. Error: ${error}`,
      jobId: job.id
    }, {
      status: 500
    })
  }

  childSpan.addEvent("job_created")
  childSpan.end()

  log("project-overengineer-fe", `endpoint="/upload" jobId="${job.id}"`, `Job created successfully`)
  incrementSuccessfulJobCounter()
  observeJobDuration(new Date().getTime() - startTime)
  uploadRequestSpan.addEvent("job_created")
  uploadRequestSpan.end()

  return NextResponse.json({
    message: "Job created",
    jobId: job.id
  }, {
    status: 201
  })
}
