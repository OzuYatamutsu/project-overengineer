import assert from "assert"
import vault from "node-vault"
import { enforceConfig } from "./verify"
import { log } from "./logging"

export const CONFIG_PREFIX = "config"

let vaultClient: vault.client

export async function getVault(serviceName: string): Promise<vault.client> {
    enforceConfig(serviceName, "VAULT_HOST")
    enforceConfig(serviceName, "VAULT_PORT")
    enforceConfig(serviceName, "VAULT_RO_TOKEN")

    if (!vaultClient) {
        log(serviceName, `opening new vault connection to https://${process.env.VAULT_HOST}:${process.env.VAULT_PORT}`)

        vaultClient = vault({
            apiVersion: "v1",
            endpoint: `https://${process.env.VAULT_HOST}:${process.env.VAULT_PORT}`,
            token: process.env.VAULT_RO_TOKEN
        })
    }

    return vaultClient
}

export async function updateEnvFromVault(serviceName: string, configName: string): Promise<void> {
    const freshValue = await (await getVault(serviceName)).read(`${CONFIG_PREFIX}/${configName}`)

    if (freshValue != process.env[configName]) {
        log(serviceName, `updating config value from vault: ${configName}`)
    }
    process.env[configName] = freshValue
}

export function watchAndUpdateVaultValue(serviceName: string, configName: string, refreshPeriodMs=60000): void {
    setInterval(async () => await updateEnvFromVault(serviceName, configName), refreshPeriodMs)
}
