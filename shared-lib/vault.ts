import assert from "assert"
import { enforceConfig } from "./verify"
import { log } from "./logging"

export function getVault(serviceName: string) {
    assert(false, "not implemented")
}

export async function updateEnvFromVault(serviceName: string, configName: string): Promise<void> {
    enforceConfig(serviceName, "VAULT_HOST")
    enforceConfig(serviceName, "VAULT_PORT")

    const freshValue = ""  // TODO, implement getting value from vault

    if (freshValue != process.env[configName]) {
        log(serviceName, `writing new config value for: ${configName}`)
    }
    process.env[configName] = freshValue
    assert(false, "not implemented")  // TODO
}

export function watchAndUpdateVaultValue(serviceName: string, configName: string, refreshPeriodMs=60000): void {
    setInterval(async () => await updateEnvFromVault(serviceName, configName), refreshPeriodMs)
}
