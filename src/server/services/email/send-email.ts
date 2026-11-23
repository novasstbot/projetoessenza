import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, isEmailConfigured } from "./resend-client";

type SendEmailInput = {
  customerId: string;
  to: string;
  templateKey: string;
  subject: string;
  html: string;
  idempotencyKey: string;
  campaignId?: string;
};

// Central transactional/campaign sender. Never fakes a successful send:
// without RESEND_API_KEY/RESEND_FROM_EMAIL it records a failed, clearly
// labeled "test environment" log instead.
export async function sendEmail(input: SendEmailInput) {
  const db = createAdminClient();

  const { data: existing } = await db
    .from("email_logs")
    .select("id, status")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing) {
    return { skipped: true as const, reason: "already_sent" as const, logId: existing.id };
  }

  if (!isEmailConfigured()) {
    await db.from("email_logs").insert({
      campaign_id: input.campaignId ?? null,
      customer_id: input.customerId,
      template_key: input.templateKey,
      status: "failed",
      idempotency_key: input.idempotencyKey,
      error:
        "Resend não configurado (ambiente de testes) — defina RESEND_API_KEY e RESEND_FROM_EMAIL.",
    });
    return { skipped: true as const, reason: "not_configured" as const };
  }

  const resend = getResendClient()!;

  const { data: logRow, error: insertError } = await db
    .from("email_logs")
    .insert({
      campaign_id: input.campaignId ?? null,
      customer_id: input.customerId,
      template_key: input.templateKey,
      status: "queued",
      idempotency_key: input.idempotencyKey,
    })
    .select("id")
    .single();

  if (insertError || !logRow) {
    throw new Error(`Falha ao registrar envio: ${insertError?.message}`);
  }

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (result.error) {
      await db
        .from("email_logs")
        .update({ status: "failed", error: result.error.message })
        .eq("id", logRow.id);
      return { skipped: false as const, success: false as const, error: result.error.message };
    }

    await db
      .from("email_logs")
      .update({
        status: "sent",
        resend_message_id: result.data?.id,
        sent_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);

    return { skipped: false as const, success: true as const, messageId: result.data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    await db.from("email_logs").update({ status: "failed", error: message }).eq("id", logRow.id);
    throw err;
  }
}
