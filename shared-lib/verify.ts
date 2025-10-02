import assert from "assert"
import { log } from "./logging"

export function enforceConfig(serviceName: string, configKey: string, print=false): void {
    assert(!!process.env[configKey], `The required env var ${configKey} wasn't set!`)
    if (print) {
        log(serviceName, `config: ${configKey}=${process.env[configKey]}`)
    }
}