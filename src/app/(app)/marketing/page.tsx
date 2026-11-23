import { AlertTriangle, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/server/auth/session";
import { isEmailConfigured } from "@/server/services/email/resend-client";
import { TemplateForm } from "@/components/marketing/template-form";
import type { EmailTemplate } from "@/modules/marketing/types";

export default async function MarketingPage() {
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const canManage = profile?.role === "admin" || profile?.role === "gerente";

  const { data: templates } = await supabase
    .from("email_templates")
    .select("id, key, name, subject, html, variables, created_at, updated_at")
    .order("created_at", { ascending: false });

  const configured = isEmailConfigured();

  return (
    <div>
      <PageHeader
        title="Marketing e Relacionamento"
        description="Templates e campanhas de e-mail via Resend, respeitando a autorização de cada contato (LGPD)."
      />

      {!configured && (
        <Card className="mb-6 border-gold/40 bg-rose/30">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-gold" />
            <p className="text-sm text-foreground">
              Ambiente de testes — configure{" "}
              <code className="rounded bg-card px-1">RESEND_API_KEY</code>,{" "}
              <code className="rounded bg-card px-1">RESEND_FROM_EMAIL</code> e o
              domínio verificado no Resend para habilitar o envio real de
              e-mails. Templates podem ser cadastrados normalmente.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Templates de e-mail</CardTitle>
          </CardHeader>
          <CardContent>
            {!templates || templates.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Mail className="size-6" />
                <p className="text-sm">Nenhum template cadastrado ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(templates as EmailTemplate[]).map((template) => (
                  <div key={template.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.key} — {template.subject}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {canManage ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Novo template</CardTitle>
            </CardHeader>
            <CardContent>
              <TemplateForm />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Apenas administradores e gerentes podem criar ou editar templates.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
