"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { emailTemplateSchema, type EmailTemplateFormValues } from "@/modules/marketing/schemas";

export async function createEmailTemplate(values: EmailTemplateFormValues) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = emailTemplateSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.from("email_templates").insert({
    key: parsed.key,
    name: parsed.name,
    subject: parsed.subject,
    html: parsed.html,
  });

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "email_templates",
    entity_id: parsed.key,
  });

  revalidatePath("/marketing");
}
