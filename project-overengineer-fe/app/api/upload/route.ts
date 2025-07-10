import { NextResponse } from 'next/server'

const DUMMY_RESULT = `
DUMMY STATIC RESULT

2xLatte Macchiato 9.00
1xGloki 5.00
1xSchweinschnitzel 22.00
1xChässpätzli 18.50

Total 54.50
`;

export async function POST(request: Request): Promise<NextResponse> {
  const contentType = request.headers.get('content-type')

  if (!contentType?.startsWith('image/')) {
    return new NextResponse('Unsupported content type', { status: 400 })
  }

  const buffer = Buffer.from(await request.arrayBuffer())

  return NextResponse.json({
    message: "Not implemented; dummy response",
    result: DUMMY_RESULT,
    size: buffer.length,
    jobId: 0,  // TODO
    status: "WAITING"  // TODO
  }, {
    status: 201
  })
}
