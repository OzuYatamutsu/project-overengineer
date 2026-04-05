import { execSync } from 'node:child_process'

export function getFeEndpointFromKubectl(): string {
    const hostname = execSync(
        'kubectl get svc -n default -l app=project-overengineer-fe -o jsonpath="{.items[0].status.loadBalancer.ingress[0].hostname}"'
    ).toString().trim()

    const port = execSync(
        'kubectl get svc -n default -l app=project-overengineer-fe -o jsonpath="{.items[0].spec.ports[0].port}"'
    ).toString().trim()

    return `${hostname}:${port}`
}