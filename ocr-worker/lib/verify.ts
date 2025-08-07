import assert from "assert";
import Redis from "ioredis";

export function enforceConfig(configKey: string, print=false): void {
    assert(!!process.env[configKey], `The required env var ${configKey} wasn't set!`)
    if (print) {
        console.log(`config: ${configKey}=${process.env[configKey]}`)
    }
}