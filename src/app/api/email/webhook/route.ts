import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createAdminClient } from "@/lib/supabase/admin";

type ResendEventType =
  | "delivered"
  | "bounced"
  | "complained"
  | "opened"
  | "clicked";

function mapResendEventType(type: string): ResendEventType | null {
  switch (type) {
    case "email.delivered":
      return "delivered";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.opened":
      return "opened";
    case "email.clicked":
      return "clicked";
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("RESEND_WEBHOOK_SECRET não configurado — webhook recusado.");
    return NextResponse.json(
      { error: "Webhook não configurado neste ambiente." },
      { status: 501 },
    );
  }

  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let event: { type: string; data?: { email_id?: string } };
  try {
    event = new Webhook(secret).verify(payload, headers) as unknown as typeof event;
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const messageId = event.data?.email_id;
  const eventType = mapResendEventType(event.type);

  if (!messageId || !eventType) {
    return NextResponse.json({ received: true });
  }

  const db = createAdminClient();

  const { data: log } = await db
    .from("email_logs")
    .select("id")
    .eq("resend_message_id", messageId)
    .maybeSingle();

  if (!log) {
    return NextResponse.json({ received: true });
  }

  await db.from("email_events").insert({
    email_log_id: log.id,
    event_type: eventType,
    payload: event,
  });

  const statusByEvent: Partial<Record<ResendEventType, string>> = {
    delivered: "delivered",
    bounced: "bounced",
    complained: "complained",
  };

  const nextStatus = statusByEvent[eventType];
  if (nextStatus) {
    await db.from("email_logs").update({ status: nextStatus }).eq("id", log.id);
  }

  return NextResponse.json({ received: true });
}
