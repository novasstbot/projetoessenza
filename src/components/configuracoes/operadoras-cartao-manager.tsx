"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IntegerInput } from "@/components/ui/integer-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createOperadoraCartao,
  toggleOperadoraCartaoAtiva,
  createOperadoraModalidade,
  updateOperadoraModalidade,
  toggleOperadoraModalidadeAtiva,
} from "@/server/actions/configuracoes/operadoras-cartao";
import {
  operadoraModalidadeSchema,
  type OperadoraModalidadeFormValues,
} from "@/modules/financeiro/schemas";
import { modalidadeLabels } from "@/modules/financeiro/types";
import type {
  ContaFinanceira,
  OperadoraCartao,
  OperadoraModalidade,
  OperadoraModalidadeTipo,
} from "@/modules/financeiro/types";

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function ModalidadeForm({
  operadoraId,
  modalidade,
  tipoFixo,
  contas,
  onDone,
}: {
  operadoraId: string;
  modalidade?: OperadoraModalidade;
  tipoFixo?: OperadoraModalidadeTipo;
  contas: ContaFinanceira[];
  onDone: () => void;
}) {
  const router = useRouter();
  const form = useForm<OperadoraModalidadeFormValues>({
    resolver: zodResolver(operadoraModalidadeSchema),
    defaultValues: {
      modalidade: modalidade?.modalidade ?? tipoFixo ?? "credito_parcelado",
      parcelas: modalidade?.parcelas ?? (tipoFixo === "credito_parcelado" ? 2 : 1),
      taxaPercentual: modalidade?.taxa_percentual ?? 0,
      taxaAntecipacaoPercentual: modalidade?.taxa_antecipacao_percentual ?? undefined,
      prazoDias: modalidade?.prazo_dias ?? 0,
      contaDestinoId: modalidade?.conta_destino_id ?? "",
    },
  });

  async function onSubmit(values: OperadoraModalidadeFormValues) {
    try {
      if (modalidade) {
        await updateOperadoraModalidade(modalidade.id, values);
        toast.success("Modalidade atualizada.");
      } else {
        await createOperadoraModalidade(operadoraId, values);
        toast.success("Modalidade criada.");
      }
      router.refresh();
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 rounded-lg border border-border p-3"
      >
        {!tipoFixo && !modalidade && (
          <FormField
            control={form.control}
            name="parcelas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nº de parcelas</FormLabel>
                <FormControl>
                  <IntegerInput min={2} step={1} value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="grid grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="taxaPercentual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taxa (%)</FormLabel>
                <FormControl>
                  <IntegerInput min={0} max={100} step={0.01} value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="taxaAntecipacaoPercentual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taxa antecipação (%)</FormLabel>
                <FormControl>
                  <IntegerInput
                    min={0}
                    max={100}
                    step={0.01}
                    value={field.value ?? 0}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="prazoDias"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prazo (dias)</FormLabel>
                <FormControl>
                  <IntegerInput min={0} step={1} value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="contaDestinoId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conta de destino</FormLabel>
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {() => contas.find((c) => c.id === field.value)?.nome ?? "Selecione"}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ModalidadeRow({
  modalidade,
  contas,
  onEdit,
}: {
  modalidade: OperadoraModalidade;
  contas: ContaFinanceira[];
  onEdit: () => void;
}) {
  const router = useRouter();

  async function handleToggle() {
    try {
      await toggleOperadoraModalidadeAtiva(modalidade.id, !modalidade.ativo);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm ${!modalidade.ativo ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2">
        {modalidade.modalidade === "credito_parcelado" && (
          <Badge variant="outline">{modalidade.parcelas}x</Badge>
        )}
        <span className="text-foreground">
          Taxa {formatPercent(modalidade.taxa_percentual)} · Prazo {modalidade.prazo_dias}d
          {modalidade.taxa_antecipacao_percentual != null &&
            ` · Antecipação ${formatPercent(modalidade.taxa_antecipacao_percentual)}`}
        </span>
        <span className="text-xs text-muted-foreground">
          → {contas.find((c) => c.id === modalidade.conta_destino_id)?.nome ?? "—"}
        </span>
      </div>
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Editar" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={modalidade.ativo ? "Desativar" : "Ativar"}
          onClick={handleToggle}
        >
          {modalidade.ativo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function OperadoraCard({ operadora, contas }: { operadora: OperadoraCartao; contas: ContaFinanceira[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [criandoParcela, setCriandoParcela] = useState(false);

  const debito = operadora.operadora_modalidades.find((m) => m.modalidade === "debito");
  const creditoVista = operadora.operadora_modalidades.find((m) => m.modalidade === "credito_vista");
  const boleto = operadora.operadora_modalidades.find((m) => m.modalidade === "boleto");
  const parcelados = operadora.operadora_modalidades
    .filter((m) => m.modalidade === "credito_parcelado")
    .sort((a, b) => a.parcelas - b.parcelas);

  async function handleToggleOperadora() {
    try {
      await toggleOperadoraCartaoAtiva(operadora.id, !operadora.ativo);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  function renderSlot(
    tipo: Extract<OperadoraModalidadeTipo, "debito" | "credito_vista" | "boleto">,
    existente: OperadoraModalidade | undefined,
  ) {
    const key = `novo-${tipo}`;
    if (editando === (existente?.id ?? key)) {
      return (
        <ModalidadeForm
          operadoraId={operadora.id}
          modalidade={existente}
          tipoFixo={tipo}
          contas={contas}
          onDone={() => setEditando(null)}
        />
      );
    }
    if (!existente) {
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setEditando(key)}
        >
          <Plus className="size-3.5" />
          Configurar {modalidadeLabels[tipo]}
        </Button>
      );
    }
    return (
      <ModalidadeRow modalidade={existente} contas={contas} onEdit={() => setEditando(existente.id)} />
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${!operadora.ativo ? "opacity-60" : "border-border"}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground">{operadora.nome}</span>
          {!operadora.ativo && <Badge variant="outline">Inativa</Badge>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={operadora.ativo ? "Desativar" : "Ativar"}
          onClick={handleToggleOperadora}
        >
          {operadora.ativo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Débito</p>
          {renderSlot("debito", debito)}
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Crédito à vista</p>
          {renderSlot("credito_vista", creditoVista)}
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Boleto</p>
          {renderSlot("boleto", boleto)}
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Crédito parcelado</p>
          <div className="space-y-1.5">
            {parcelados.map((m) =>
              editando === m.id ? (
                <ModalidadeForm
                  key={m.id}
                  operadoraId={operadora.id}
                  modalidade={m}
                  contas={contas}
                  onDone={() => setEditando(null)}
                />
              ) : (
                <ModalidadeRow key={m.id} modalidade={m} contas={contas} onEdit={() => setEditando(m.id)} />
              ),
            )}
            {criandoParcela ? (
              <ModalidadeForm
                operadoraId={operadora.id}
                tipoFixo="credito_parcelado"
                contas={contas}
                onDone={() => setCriandoParcela(false)}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setCriandoParcela(true)}
              >
                <Plus className="size-3.5" />
                Nova quantidade de parcelas
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OperadorasCartaoManager({
  operadoras,
  contas,
}: {
  operadoras: OperadoraCartao[];
  contas: ContaFinanceira[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (nome.trim().length < 2) return;
    setSubmitting(true);
    try {
      await createOperadoraCartao({ nome: nome.trim() });
      setNome("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Operadoras e formas de recebimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome da operadora (ex: Stone, Cielo)"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
          />
          <Button type="button" size="icon" disabled={submitting} onClick={handleCreate}>
            <Plus className="size-4" />
          </Button>
        </div>

        {operadoras.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma operadora cadastrada.</p>
        ) : (
          operadoras.map((operadora) => (
            <OperadoraCard key={operadora.id} operadora={operadora} contas={contas} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
