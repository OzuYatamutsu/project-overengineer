import vault from "node-vault"
import { enforceConfig } from "./verify"
import { log } from "./logging"

export const CONFIG_PREFIX = "secret/data"

let vaultClient: vault.client

export async function getVault(serviceName: string, insecure=false): Promise<vault.client> {
    enforceConfig(serviceName, "VAULT_HOST")
    enforceConfig(serviceName, "VAULT_PORT")
    enforceConfig(serviceName, "VAULT_RO_TOKEN")

    const endpoint = `${insecure ? 'http' : 'https'}://${process.env.VAULT_HOST}:${process.env.VAULT_PORT}`
    if (!vaultClient) {
        log(serviceName, `opening new vault connection to ${endpoint}`)

        vaultClient = vault({
            apiVersion: "v1",
            endpoint: endpoint,
            token: process.env.VAULT_RO_TOKEN
        })
    }

    return vaultClient
}

export async function getValue(serviceName: string, configName: string, insecure=false): Promise<any> {
    const result = (
        await (await getVault(serviceName, insecure)).read(`${CONFIG_PREFIX}/${configName}`)
    )

    return result.data.data[configName]
}

export async function writeValue(serviceName: string, configName: string, value: any, insecure=false): Promise<void> {
    await (await getVault(serviceName, insecure)).write(`${CONFIG_PREFIX}/${configName}`, {data: {"value": value}})
}

export async function updateEnvFromVault(serviceName: string, configName: string, insecure=false): Promise<void> {
    const freshValue = await getValue(serviceName, configName, insecure)

    if (freshValue != process.env[configName]) {
        log(serviceName, `updating config value from vault: ${configName}`)
    }
    process.env[configName] = freshValue
}

export function watchAndUpdateVaultValue(serviceName: string, configName: string, refreshPeriodMs=60000, insecure=false): void {
    setInterval(async () => await updateEnvFromVault(serviceName, configName, insecure), refreshPeriodMs)
}
