import { registerMetrics, getRegister } from "./handler"

let _metrics_inited = false

export async function GET(request: Request) {
    if (!_metrics_inited) {
        registerMetrics()
        _metrics_inited = true
    }
    const metrics = await getRegister().metrics();
    return new Response(metrics, {
        headers: {
            "Content-Type": getRegister().contentType,
        },
    });
}
