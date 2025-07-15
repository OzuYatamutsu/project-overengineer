import { NextResponse } from 'next/server'
import { Job } from '@/lib/job'
import { standarizeImage } from './handler'

export async function POST(request: Request): Promise<NextResponse> {
  const contentType = request.headers.get('content-type')

  if (!contentType?.startsWith('image/')) {
    return NextResponse.json({
      message: 'Unsupported content type',
      jobId: "",
    }, {
      status: 400
    })
  }

  // Convert and standardize image format
  const imageData = await standarizeImage(
    Buffer.from(await request.arrayBuffer())
  )

  // Create job
  const job = new Job(imageData)

  return NextResponse.json({
    message: "Job created (dummy response)",
    jobId: job.id
  }, {
    status: 201
  })
}
