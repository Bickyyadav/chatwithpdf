import crypto from "crypto";

export async function POST(req: any) {
    try {
        // Catch the event type
        const clonedReq = req.clone();
        const eventType = req.headers.get("X-Event-Name");
        const body = await req.json();

        // Check signature
        const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SIGNATURE;
        if (!secret) {
            return Response.json({ message: "your have wrong secret" });
        }
        const hmac = crypto.createHmac("sha256", secret);
        const digest = Buffer.from(
            hmac.update(await clonedReq.text()).digest("hex"),
            "utf8"
        );
        const signature = Buffer.from(req.headers.get("X-Signature") || "", "utf8");

        if (!crypto.timingSafeEqual(digest, signature)) {
            throw new Error("Invalid signature.");
        }

        console.log(body);

        // Logic according to event
        if (eventType === "order_created") {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const userId = body.meta.custom_data.user_id;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const isSuccessful = body.data.attributes.status === "paid";
        }

        return Response.json({ message: "Webhook received" });
    } catch (err) {
        console.error(err);
        return Response.json({ message: "Server error" }, { status: 500 });
    }
}
