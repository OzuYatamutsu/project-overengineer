import { NextResponse } from 'next/server'
import { createJwt } from '@/app/actions'
import { createHash } from 'crypto'

const TEST_IMAGE_HASH = "8acedaae7dcd5cc3358dac05c4b0a071ef12385a41152571d2211dbaa8252902"

// /api/v1/_test/generate_test_jwt is hit by integration tests to generate a
// valid JWT only when the specified test image is provided.
export async function POST(request: Request): Promise<NextResponse> {
    const jobId = request.headers.get("x-test-job-id") || ""
    const rawImageData = await request.arrayBuffer()
    const hash = createHash('sha256').update(Buffer.from(rawImageData)).digest('hex')

    if (hash !== TEST_IMAGE_HASH) {
        return NextResponse.json({
            message: 'Invalid test image',
            jobId: jobId,
        }, {
            status: 400
        })
    }

    if (!jobId) {
        return NextResponse.json({
            message: 'Missing x-test-job-id header',
            jobId: jobId,
        }, {
            status: 400
        })
    }

    const jwt = createJwt(jobId)
    return NextResponse.json({
        message: 'Test JWT generated',
        jobId: jobId,
        jwt: jwt
    }, {
        status: 200
    })
}
