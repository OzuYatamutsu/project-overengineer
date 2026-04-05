import { execSync } from 'node:child_process'

export function getFeEndpointFromKubectl(): string {
    const hostname = execSync(
        'kubectl get svc svc-project-overengineer-fe -o jsonpath="{.status.loadBalancer.ingress[0].hostname}"'
    ).toString().trim()

    const port = execSync(
        'kubectl get svc svc-project-overengineer-fe -o jsonpath="{.spec.ports[0].port}"'
    ).toString().trim()

    return `${hostname}:${port}`
}