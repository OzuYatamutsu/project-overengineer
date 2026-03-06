import os from "os"

export function log(serviceName: string, attributes_raw: string, message: string): void {
    console.log(`${_logPrefix(serviceName)} ${attributes_raw} msg="${message}"`)
}

function _logPrefix(serviceName: string): string {
    return (
        `timestamp=${new Date().toISOString()} ` +
        `service=${serviceName} ` +
        `host=${os.hostname()}`
    )
}