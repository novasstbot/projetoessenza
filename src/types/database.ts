// Hand-written row types matching the stage-1 migrations (supabase/migrations).
// Replace with `supabase gen types typescript` once the CLI is linked to the
// correct project — see the note left for the user about the account mismatch.

export type UserRole = "admin" | "gerente" | "vendedor" | "estoquista";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CustomerRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  origin: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunicationPreferenceRow = {
  customer_id: string;
  email_opt_in: boolean;
  opt_in_source: string | null;
  opt_in_at: string | null;
  opt_out_at: string | null;
};

export type EmailTemplateRow = {
  id: string;
  key: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
  created_at: string;
  updated_at: string;
};

export type EmailCampaignRow = {
  id: string;
  name: string;
  template_id: string;
  segment: Record<string, unknown>;
  status: "draft" | "scheduled" | "sending" | "sent" | "canceled";
  scheduled_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type EmailLogRow = {
  id: string;
  campaign_id: string | null;
  customer_id: string;
  template_key: string;
  resend_message_id: string | null;
  status: "queued" | "sent" | "delivered" | "bounced" | "complained" | "failed";
  idempotency_key: string;
  error: string | null;
  sent_at: string | null;
  created_at: string;
};

export type EmailEventRow = {
  id: string;
  email_log_id: string;
  event_type: "delivered" | "bounced" | "complained" | "opened" | "clicked";
  payload: Record<string, unknown>;
  occurred_at: string;
};
