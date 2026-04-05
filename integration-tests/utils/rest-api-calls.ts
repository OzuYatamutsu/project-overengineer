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
