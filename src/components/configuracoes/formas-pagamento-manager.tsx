"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFormaPagamento,
  toggleFormaPagamentoAtiva,
  updateFormaPagamentoContaDestino,
} from "@/server/actions/configuracoes/formas-pagamento";
import type { FormaPagamentoConfig } from "@/modules/pdv/types";
import type { ContaFinanceira } from "@/modules/financeiro/types";

function NovaFormaPagamentoForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [ehCartao, setEhCartao] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (nome.trim().length < 2) {
      toast.error("Informe o nome da forma de pagamento.");
      return;
    }
    setSubmitting(true);
    try {
      await createFormaPagamento({ nome: nome.trim(), ehCartao });
      toast.success("Forma de pagamento criada.");
      router.refresh();
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <Input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Ex.: Vale-presente, Boleto"
      />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">É uma forma de pagamento no cartão?</span>
        <Button
          type="button"
          size="xs"
          variant={ehCartao ? "default" : "outline"}
          onClick={() => setEhCartao(true)}
        >
          Sim
        </Button>
        <Button
          type="button"
          size="xs"
          variant={!ehCartao ? "default" : "outline"}
          onClick={() => setEhCartao(false)}
        >
          Não
        </Button>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={submitting} onClick={handleCreate}>
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function FormasPagamentoManager({
  formasPagamento,
  contas,
}: {
  formasPagamento: FormaPagamentoConfig[];
  contas: ContaFinanceira[];
}) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);

  async function handleChangeConta(formaId: string, contaId: string) {
    try {
      await updateFormaPagamentoContaDestino(formaId, contaId);
      toast.success("Destino atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  async function handleToggleAtiva(forma: FormaPagamentoConfig) {
    try {
      await toggleFormaPagamentoAtiva(forma.id, !forma.ativo);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Formas de pagamento</CardTitle>
          <p className="text-sm text-muted-foreground">
            Define pra qual conta o dinheiro de cada forma de pagamento vai quando uma venda é
            concluída.
          </p>
        </div>
        {!criando && (
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setCriando(true)}>
            <Plus className="size-4" />
            Nova forma
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {criando && <NovaFormaPagamentoForm onDone={() => setCriando(false)} />}

        {formasPagamento.map((forma) => (
          <div
            key={forma.id}
            className={`flex items-center justify-between gap-3 rounded-lg border border-border p-3 ${!forma.ativo ? "opacity-60" : ""}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">{forma.nome}</span>
              {forma.eh_cartao && <Badge variant="outline">Cartão</Badge>}
              {!forma.ativo && <Badge variant="outline">Inativa</Badge>}
            </div>
            <div className="flex items-center gap-1.5">
              <Select
                value={forma.conta_financeira_id ?? undefined}
                onValueChange={(v) => v && handleChangeConta(forma.id, v)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue>
                    {() =>
                      contas.find((c) => c.id === forma.conta_financeira_id)?.nome ??
                      "Selecione a conta de destino"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={forma.ativo ? "Desativar" : "Ativar"}
                onClick={() => handleToggleAtiva(forma)}
              >
                {forma.ativo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
