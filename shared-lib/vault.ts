import assert from "assert";
import { enforceConfig } from "./verify";

export function getVault(serviceName: string) {
    assert(false, "not implemented")
}

export async function getValueFromVault(serviceName: string, configName: string): Promise<string> {
    enforceConfig(serviceName, "VAULT_HOST")
    enforceConfig(serviceName, "VAULT_PORT")

    assert(false, "not implemented")
    return ""
}

export function watchAndUpdateVaultValue(serviceName: string, configName: string, refreshPeriodMs=60000): void {
    setInterval(async () => await getValueFromVault(serviceName, configName), refreshPeriodMs)
}
