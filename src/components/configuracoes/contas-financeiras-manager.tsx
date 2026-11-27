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
import { CurrencyInput } from "@/components/ui/currency-input";
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
  createContaFinanceira,
  updateContaFinanceira,
  toggleContaFinanceiraAtiva,
} from "@/server/actions/configuracoes/contas-financeiras";
import {
  contaFinanceiraSchema,
  type ContaFinanceiraFormValues,
} from "@/modules/financeiro/schemas";
import type { ContaFinanceira, ContaFinanceiraTipo } from "@/modules/financeiro/types";

const tipoLabels: Record<ContaFinanceiraTipo, string> = {
  caixa_fisico: "Caixa físico",
  cofre: "Cofre",
  banco: "Conta bancária",
  pix: "Pix (legado)",
  recebiveis_cartao: "Recebíveis cartão (legado)",
  transito: "Dinheiro em trânsito",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function ContaForm({
  conta,
  onDone,
}: {
  conta?: ContaFinanceira;
  onDone: () => void;
}) {
  const router = useRouter();
  const form = useForm<ContaFinanceiraFormValues>({
    resolver: zodResolver(contaFinanceiraSchema),
    defaultValues: {
      nome: conta?.nome ?? "",
      tipo: conta?.tipo ?? "banco",
      bancoNome: conta?.banco_nome ?? "",
      agencia: conta?.agencia ?? "",
      numeroConta: conta?.numero_conta ?? "",
      saldoInicial: conta?.saldo_inicial ?? 0,
      dataSaldoInicial: conta?.data_saldo_inicial ?? "",
    },
  });

  const tipo = form.watch("tipo");

  async function onSubmit(values: ContaFinanceiraFormValues) {
    try {
      if (conta) {
        await updateContaFinanceira(conta.id, values);
        toast.success("Conta atualizada.");
      } else {
        await createContaFinanceira(values);
        toast.success("Conta criada.");
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
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da conta</FormLabel>
              <FormControl>
                <Input placeholder="Banco do Brasil - Conta corrente" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>{() => tipoLabels[field.value as ContaFinanceiraTipo]}</SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(["caixa_fisico", "cofre", "banco", "transito"] as const).map((t) => (
                    <SelectItem key={t} value={t}>
                      {tipoLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {tipo === "banco" && (
          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="bancoNome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instituição</FormLabel>
                  <FormControl>
                    <Input placeholder="Nubank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="agencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agência (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numeroConta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="saldoInicial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Saldo inicial</FormLabel>
                <FormControl>
                  <CurrencyInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dataSaldoInicial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data do saldo inicial</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

export function ContasFinanceirasManager({ contas }: { contas: ContaFinanceira[] }) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  async function handleToggle(conta: ContaFinanceira) {
    try {
      await toggleContaFinanceiraAtiva(conta.id, !conta.ativo);
      toast.success(conta.ativo ? "Conta inativada." : "Conta ativada.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Contas financeiras</CardTitle>
        {!criando && (
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setCriando(true)}>
            <Plus className="size-4" />
            Nova conta
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {criando && <ContaForm onDone={() => setCriando(false)} />}

        {contas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
        ) : (
          contas.map((conta) =>
            editandoId === conta.id ? (
              <ContaForm key={conta.id} conta={conta} onDone={() => setEditandoId(null)} />
            ) : (
              <div
                key={conta.id}
                className={`flex items-center justify-between rounded-lg border border-border p-3 ${!conta.ativo ? "opacity-60" : ""}`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground">{conta.nome}</span>
                    <Badge variant="outline">{tipoLabels[conta.tipo]}</Badge>
                    {!conta.ativo && <Badge variant="outline">Inativa</Badge>}
                  </div>
                  {(conta.banco_nome || conta.agencia || conta.numero_conta) && (
                    <p className="text-xs text-muted-foreground">
                      {[conta.banco_nome, conta.agencia && `ag. ${conta.agencia}`, conta.numero_conta && `cc ${conta.numero_conta}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Saldo inicial: {formatCurrency(conta.saldo_inicial)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar"
                    onClick={() => setEditandoId(conta.id)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={conta.ativo ? "Inativar" : "Ativar"}
                    onClick={() => handleToggle(conta)}
                  >
                    {conta.ativo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </div>
            ),
          )
        )}
      </CardContent>
    </Card>
  );
}
