import os from "os"

export function log(serviceName: string, message: string): void {
    console.log(`${_logPrefix(serviceName)} ${message}`)
}

function _logPrefix(serviceName: string): string {
    return (
        `${new Date().toISOString()} ` +
        `${serviceName}@${os.hostname()}:`
    )
}