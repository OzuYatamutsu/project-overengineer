import { registerMetricsIfRequired, getRegister } from "./handler"

export async function GET(_request: Request) {
    await registerMetricsIfRequired()

    const metrics = await getRegister().metrics();
    return new Response(metrics, {
        headers: {
            "Content-Type": getRegister().contentType,
        },
    });
}
