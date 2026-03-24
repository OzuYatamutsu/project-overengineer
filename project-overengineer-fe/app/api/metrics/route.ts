import { registerMetrics, getRegister } from "./handler"

let _metrics_inited: Promise<void> | null = null

export async function GET(_request: Request) {
    if (!_metrics_inited) {
        _metrics_inited = Promise.resolve(registerMetrics())
    }
    await _metrics_inited

    const metrics = await getRegister().metrics();
    return new Response(metrics, {
        headers: {
            "Content-Type": getRegister().contentType,
        },
    });
}
