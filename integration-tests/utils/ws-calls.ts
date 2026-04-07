import { WebSocket } from 'ws'

export async function monitorJobStatus(statusApiUrl: string, jobId: string, jwt: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const ws = new WebSocket(statusApiUrl)
        let result: string = ""

        ws.on('open', () => {
            console.log(`WebSocket connection to status API opened, starting to monitor job ${jobId}`)
            ws.send(JSON.stringify({
                job: { jobId: jobId },
                jwt: jwt
            }))
        })

        ws.on('message', (data: string) => {
            console.log(`Received message from status API: ${data}`)

            const msg = JSON.parse(data)
            if (msg.status === "DONE") {
                result = msg.result
                console.log(`Job ${jobId} completed processing, closing WebSocket connection to status API`)
                ws.close()
                resolve(result)
            }
        })

        ws.on('close', () => {
            console.log(`WebSocket connection to status API closed`)
        })

        ws.on('error', (err: Error) => {
            console.error(`Error in WebSocket connection to status API: ${err}`)
            reject(err)
        })
    })
}