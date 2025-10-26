import assert from "assert"
import vault from "node-vault"
import { enforceConfig } from "./verify"
import { log } from "./logging"

const CONFIG_PREFIX = ""

let vaultClient: vault.client

export async function getVault(serviceName: string) {
    enforceConfig(serviceName, "VAULT_HOST")
    enforceConfig(serviceName, "VAULT_PORT")

    if (!vaultClient) {
        log(serviceName, `opening new vault connection to https://${process.env.VAULT_HOST}:${process.env.VAULT_PORT}`)

        vaultClient = vault({
            apiVersion: "v1",
            endpoint: `https://${process.env.VAULT_HOST}:${process.env.VAULT_PORT}`
            // token: process.env.VAULT_TOKEN
            // TODO auth
        })
    }
    
    return vaultClient
}

export async function updateEnvFromVault(serviceName: string, configName: string): Promise<void> {
    const freshValue = await (await getVault(serviceName)).read(`config/${configName}`)

    if (freshValue != process.env[configName]) {
        log(serviceName, `updating config value from vault: ${configName}`)
    }
    process.env[configName] = freshValue
}

export function watchAndUpdateVaultValue(serviceName: string, configName: string, refreshPeriodMs=60000): void {
    setInterval(async () => await updateEnvFromVault(serviceName, configName), refreshPeriodMs)
}
