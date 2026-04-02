import { NextResponse } from 'next/server'

/*
 * Used to get current url of status api
 */
export async function GET(_request: Request): Promise<NextResponse> {
  return NextResponse.json({
    statusApiUrl: process.env.STATUS_API_URL
  })
}
