import { NextResponse } from 'next/server'
import { Job } from '@/lib/job'
import { standarizeImage, validateImage } from './handler'

export async function POST(request: Request): Promise<NextResponse> {
  console.log(`Processing new request...`)
  const contentType = request.headers.get('content-type')

  if (!contentType?.startsWith('image/')) {
    console.log(`Rejected request (failed validation)`)

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
    console.log(`Rejected request (failed validation)`)
  
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

  console.log(`Request was upgraded to a job with ID: ${job.id}`)

  return NextResponse.json({
    message: "Job created (dummy response)",
    jobId: job.id
  }, {
    status: 201
  })
}
