export async function getStatusApiUrlFromMetadataEndpoint(feEndpointBase: string): Promise<string> {
    const apiCall = await fetch(`${feEndpointBase}/api/v1/metadata`)
    if (!apiCall.ok) {
        throw new Error(`Failed to fetch metadata from ${feEndpointBase}/api/v1/metadata: ${apiCall.status} ${apiCall.statusText}`)
    }

    const metadata = await apiCall.json()
    if (!metadata.statusApiUrl) {
        throw new Error(`Metadata response does not contain statusApiUrl: ${JSON.stringify(metadata)}`)
    }

    return metadata.statusApiUrl
}

export async function postImageAgainstUploadEndpoint(feEndpointBase: string, imageBuffer: Buffer): Promise<string> {
    const apiCall = await fetch(`${feEndpointBase}/api/v1/upload`, {
        method: "POST",
        headers: {
            "Content-Type": "image/jpeg"
        },
        body: new Uint8Array(imageBuffer)
    })

    if (!apiCall.ok) {
        throw new Error(`Failed to upload image to ${feEndpointBase}/api/v1/upload: ${apiCall.status} ${apiCall.statusText}`)
    }

    const response = await apiCall.json()

    if (!response.jobId) {
        throw new Error(`Upload response does not contain jobId: ${JSON.stringify(response)}`)
    }

    console.log(`Image uploaded successfully, full response: ${JSON.stringify(response)}; returning jobId`)
    return response.jobId
}

export async function getJwtForTestImage(feEndpointBase: string, jobId: string, imageBuffer: Buffer): Promise<string> {
    const apiCall = await fetch(`${feEndpointBase}/api/v1/_test/generate_test_jwt`, {
        method: "POST",
        headers: {
            "Content-Type": "image/jpeg",
            "x-test-job-id": jobId
        },
        body: new Uint8Array(imageBuffer)
    })

    if (!apiCall.ok) {
        throw new Error(`Failed to get test JWT from ${feEndpointBase}/api/v1/_test/generate_test_jwt: ${apiCall.status} ${apiCall.statusText}`)
    }

    const response = await apiCall.json()

    if (!response.jwt) {
        throw new Error(`Test JWT response does not contain jwt: ${JSON.stringify(response)}`)
    }

    console.log(`Test JWT generated successfully, full response: ${JSON.stringify(response)}; returning jwt`)
    return response.jwt
}