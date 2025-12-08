import vault from "node-vault"
import { enforceConfig } from "./verify"
import { log } from "./logging"

export const CONFIG_PREFIX = "secret/data"
export const JWT_KEY_NAME = "transit/sign/jwt-signer"
export const JWT_VERIFY_KEY_NAME = "transit/verify/jwt-signer"
const _IS_UNIT_TESTING = !!process.env["_IS_UNIT_TESTING"]
const _UNIT_TESTING_ENCRYPTION_KEY = "BB34B427-74EE-4C4A-BED6-F958345EF455"
const _SIGNATURE_PREFIX = "vault:v1:"
const jwtValidTimeSec = 900

let vaultClient: vault.client 

export async function getVault(serviceName: string, insecure=false): Promise<vault.client> {
    enforceConfig(serviceName, "VAULT_HOST")
    enforceConfig(serviceName, "VAULT_PORT")
    enforceConfig(serviceName, "VAULT_RO_TOKEN")

    const endpoint = `${insecure ? 'http' : 'https'}://${process.env.VAULT_HOST}:${process.env.VAULT_PORT}`
    let shouldReconnect = false

    if (vaultClient) {
        try {
            await vaultClient.health()
        }

        catch (err) {
            log(serviceName, `vault client connection issue, reestablishing connection: ${err}`)
            shouldReconnect = true
        }
    }
    if (!vaultClient || shouldReconnect) {
        log(serviceName, `opening new vault connection to ${endpoint}`)

        vaultClient = vault({
            apiVersion: "v1",
            endpoint: endpoint,
            token: process.env.VAULT_RO_TOKEN
        })

        try {
            await vaultClient.health()
        }
        
        catch (err) {
            log(serviceName, `unable to establish vault client connection! err: ${err}`)
        }

    }

    return vaultClient
}

export async function getValue(serviceName: string, configName: string, insecure=false): Promise<string> {
    const result = (
        await (await getVault(serviceName, insecure)).read(`${CONFIG_PREFIX}/${configName}`)
    )

    if (result.data.value) {
        return result.data.value  // kv v2
    }
    return result.data.data.value  // kv v1
}

export async function writeValue(serviceName: string, configName: string, value: string, insecure=false): Promise<void> {
    await (await getVault(serviceName, insecure)).write(`${CONFIG_PREFIX}/${configName}`, {data: {"value": value}})
}

export async function updateEnvFromVault(serviceName: string, configName: string, insecure=false): Promise<void> {
    const freshValue = await getValue(serviceName, configName, insecure)

    if (freshValue !== process.env[configName]) {
        log(serviceName, `updating config value from vault: ${configName}`)
    }
    process.env[configName] = freshValue
}

export function watchAndUpdateVaultValue(serviceName: string, configName: string, refreshPeriodMs=60000, insecure=false): NodeJS.Timeout {
    return setInterval(async () => await updateEnvFromVault(serviceName, configName, insecure), refreshPeriodMs)
}

export async function pullAndWatchVaultConfigValues(serviceName: string, insecure=false): Promise<NodeJS.Timeout[]> {
    log(serviceName, "startup: pulling fresh config values...")
    await updateEnvFromVault(serviceName, "REDIS_HOST", insecure)
    await updateEnvFromVault(serviceName, "REDIS_PORT", insecure)
    await updateEnvFromVault(serviceName, "REDIS_PASSWORD", insecure)
    log(serviceName, "startup: config values updated.")
    log(serviceName, "startup: starting config update job...")
    const bgJobs = [
        watchAndUpdateVaultValue(serviceName, "REDIS_HOST", 60000, insecure),
        watchAndUpdateVaultValue(serviceName, "REDIS_PORT", 60000, insecure),
        watchAndUpdateVaultValue(serviceName, "REDIS_PASSWORD", 60000, insecure)
    ]
    log(serviceName, "startup: started config update job.")
    return bgJobs
}

export async function getImageEncryptionKey(serviceName: string, insecure=false): Promise<string> {
    if (_IS_UNIT_TESTING) {
        // return dummy value for unit tests
        return _UNIT_TESTING_ENCRYPTION_KEY
    }
    return await getValue(serviceName, "IMAGE_KEY", insecure)
}

export async function generateJwt(serviceName: string, jobId: string, insecure=false): Promise<string> {
    // Compose the JWT
    const jwtHeader = {"alg": "EdDSA", "typ": "JWT"}
    const jwtPayload = {"jobId": jobId, "exp": Math.floor(Date.now() / 1000) + jwtValidTimeSec}

    let jwt = (
        Buffer.from(JSON.stringify(jwtHeader)).toString("base64url")
        + "."
        + Buffer.from(JSON.stringify(jwtPayload)).toString("base64url")
    )

    // Connect to vault to generate a signature
    try {
        const signature: string = (await (await getVault(serviceName, insecure)).write(JWT_KEY_NAME, {
            input: Buffer.from(jwt).toString("base64")
        }))["data"]["signature"].replace(_SIGNATURE_PREFIX, "")

        // Complete the JWT (vault returns base64, but signature is binary)
        jwt += `.${Buffer.from(signature, "base64").toString("base64url")}`
    } catch (error) {
        log(serviceName, `error signing JWT: ${error}`)
        throw(error)
    }

    return jwt
}

export async function verifyJwt(serviceName: string, jwt: string, jobId: string, insecure=false): Promise<boolean> {
    // Decompose the JWT
    const jwtHeaderBase64url = jwt.split(".")[0]
    const jwtPayloadBase64url = jwt.split(".")[1]
    const jwtSignature: Buffer = Buffer.from(jwt.split(".")[2], "base64url")

    // Verify the JWT grants access to the specified job
    if (JSON.parse(Buffer.from(jwtPayloadBase64url, "base64url").toString("utf8")).jobId !== jobId) {
        return false
    }

    // Verify the JWT isn't expired
    if (JSON.parse(Buffer.from(jwtPayloadBase64url, "base64url").toString("utf8")).exp < Math.floor(Date.now() / 1000)) {
        return false
    }

    // Connect to vault to validate the signature
    try {
        return (await (await getVault(serviceName, insecure)).write(JWT_VERIFY_KEY_NAME, {
            input: Buffer.from(
                jwtHeaderBase64url
                + "."
                + jwtPayloadBase64url
            ).toString("base64"),
            signature: `${_SIGNATURE_PREFIX}${jwtSignature.toString("base64")}`
        }))["data"]["valid"]
    } catch (error) {
        log(serviceName, `error verifying JWT: ${error}`)
        throw(error)
    }
}
