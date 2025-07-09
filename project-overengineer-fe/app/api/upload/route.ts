import { NextResponse } from 'next/server'

export async function POST(request: Request): Promise<NextResponse> {
  const contentType = request.headers.get('content-type')

  if (!contentType?.startsWith('image/')) {
    return new NextResponse('Unsupported content type', { status: 400 })
  }

  const buffer = Buffer.from(await request.arrayBuffer())

  return NextResponse.json({
    message: "Got your image data!",
    size: buffer.length,
    type: contentType,
    status: 201,
  })
}
