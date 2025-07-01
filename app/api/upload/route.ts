import { NextResponse } from 'next/server'

export async function POST(request: Request): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Not implemented" },
    { status: 501 }
  )
}
