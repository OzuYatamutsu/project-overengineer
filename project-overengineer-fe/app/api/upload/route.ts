import { NextResponse } from 'next/server'
import Busboy from 'busboy'
import { streamToBuffer } from '@/app/api/upload/helpers'
import { Readable } from 'stream'

export async function POST(request: Request): Promise<NextResponse> {
  const bb = Busboy({
    headers: { 'content-type': request.headers.get('content-type') || ''}
  })
  const requestStream = Readable.from(Buffer.from(await request.arrayBuffer()))
  const fileBufferPromise = new Promise<{
    data: Buffer
  }>((resolve, reject) => {
    let fileBuffer: Buffer

    bb.on('file', (_name, file, _info) => {
      streamToBuffer(file).then(buffer => {
        fileBuffer = buffer
      })
    })

    // bb.on('data', (chunk) => {chunk.length})

    bb.on('close', () => {
      resolve({ data: fileBuffer })
    })
    bb.on('error', reject)
    requestStream.pipe(bb)
  })

  const { data } = await fileBufferPromise

  return NextResponse.json({
    message: 'Got your image data!',
    data,
    size: data.length,
    status: 201
  })
}
