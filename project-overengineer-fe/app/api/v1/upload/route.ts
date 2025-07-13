import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

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

  const imageData = Buffer.from(await request.arrayBuffer())
  const jobId = uuidv4()

  // TODO: write imageData to db
  // TODO: create job

  return NextResponse.json({
    message: "Job created (dummy response)",
    jobId: jobId
  }, {
    status: 201
  })
}
