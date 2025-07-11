import { NextResponse } from 'next/server'

export async function POST(request: Request): Promise<NextResponse> {
  const contentType = request.headers.get('content-type')

  if (!contentType?.startsWith('image/')) {
    return new NextResponse('Unsupported content type', { status: 400 })
  }

  const imageData = Buffer.from(await request.arrayBuffer())

  // TODO: write imageData to db
  // TODO: create job

  return NextResponse.json({
    message: "Job created (dummy response)",
    jobId: 0  // TODO
  }, {
    status: 201
  })
}
