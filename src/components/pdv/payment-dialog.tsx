"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, CreditCard, User, X, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { CnpjCpfInput } from "@/components/ui/cnpj-cpf-input";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import { finalizarVenda } from "@/server/actions/pdv/vendas";
import { createClienteRapido } from "@/server/actions/clientes/clientes";
import {
  clienteRapidoSchema,
  type ClienteRapidoFormValues,
} from "@/modules/clientes/schemas";
import type { CartItem, ClientePdv, FormaPagamento } from "@/modules/pdv/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

type PaymentLine = { id: string; forma_pagamento_id: string; valor: number };

function NovoClienteForm({
  onCreated,
  onCancel,
}: {
  onCreated: (cliente: ClientePdv) => void;
  onCancel: () => void;
}) {
  const form = useForm<ClienteRapidoFormValues>({
    resolver: zodResolver(clienteRapidoSchema),
    defaultValues: { full_name: "", cpf_cnpj: "", phone: "", email: "", data_nascimento: "" },
  });

  async function onSubmit(values: ClienteRapidoFormValues) {
    try {
      const cliente = await createClienteRapido(values);
      toast.success("Cliente cadastrado.");
      onCreated({ id: cliente.id, full_name: cliente.full_name, cpf_cnpj: values.cpf_cnpj || null });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar o cliente.");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-2 rounded-lg border border-border p-3"
      >
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Nome</FormLabel>
              <FormControl>
                <Input placeholder="Maria Silva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="cpf_cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">CPF</FormLabel>
                <FormControl>
                  <CnpjCpfInput placeholder="000.000.000-00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Telefone</FormLabel>
                <FormControl>
                  <PhoneInput placeholder="(00) 00000-0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">E-mail</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="maria@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="data_nascimento"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Nascimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground">Informe e-mail ou telefone.</p>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" className="flex-1" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : "Confirmar cadastro"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ClientePicker({
  clientes,
  clienteId,
  onChange,
}: {
  clientes: ClientePdv[];
  clienteId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [term, setTerm] = useState("");
  const [cadastrando, setCadastrando] = useState(false);
  const [novosClientes, setNovosClientes] = useState<ClientePdv[]>([]);

  const todosClientes = useMemo(() => [...novosClientes, ...clientes], [novosClientes, clientes]);
  const selecionado = todosClientes.find((c) => c.id === clienteId);

  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    if (!t) return [];
    return todosClientes
      .filter(
        (c) =>
          c.full_name.toLowerCase().includes(t) ||
          (digits && (c.cpf_cnpj ?? "").replace(/\D/g, "").includes(digits)),
      )
      .slice(0, 5);
  }, [todosClientes, term]);

  if (selecionado) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
        <span className="flex items-center gap-1.5 text-foreground">
          <User className="size-3.5" />
          {selecionado.full_name}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Remover cliente"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  if (cadastrando) {
    return (
      <NovoClienteForm
        onCancel={() => setCadastrando(false)}
        onCreated={(cliente) => {
          setNovosClientes((prev) => [cliente, ...prev]);
          onChange(cliente.id);
          setCadastrando(false);
        }}
      />
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="relative flex-1">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Nome ou CPF (opcional)"
        />
        {matches.length > 0 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
            {matches.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                onClick={() => {
                  onChange(cliente.id);
                  setTerm("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span>{cliente.full_name}</span>
                {cliente.cpf_cnpj && (
                  <span className="text-xs text-muted-foreground">{cliente.cpf_cnpj}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Cadastrar novo cliente"
        onClick={() => setCadastrando(true)}
      >
        <UserPlus className="size-4" />
      </Button>
    </div>
  );
}

function PaymentForm({
  items,
  desconto,
  formasPagamento,
  clientes,
  onSuccess,
}: {
  items: CartItem[];
  desconto: number;
  formasPagamento: FormaPagamento[];
  clientes: ClientePdv[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const subtotal = items.reduce((sum, i) => sum + i.produto.preco_venda * i.quantidade, 0);
  const total = Math.max(subtotal - desconto, 0);

  const [lines, setLines] = useState<PaymentLine[]>(() => [
    { id: crypto.randomUUID(), forma_pagamento_id: formasPagamento[0]?.id ?? "", valor: total },
  ]);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const alocado = lines.reduce((sum, l) => sum + l.valor, 0);
  const restante = Math.round((total - alocado) * 100) / 100;

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        forma_pagamento_id: formasPagamento[0]?.id ?? "",
        valor: Math.max(restante, 0),
      },
    ]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLine(id: string, patch: Partial<PaymentLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function handleFinalizar() {
    setSubmitting(true);
    try {
      await finalizarVenda({
        itens: items.map((i) => ({ produto_id: i.produto.id, quantidade: i.quantidade })),
        pagamentos: lines.map((l) => ({
          forma_pagamento_id: l.forma_pagamento_id,
          valor: l.valor,
        })),
        desconto,
        clienteId: clienteId ?? undefined,
      });
      toast.success("Venda finalizada.");
      onSuccess();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível finalizar a venda.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Cliente</Label>
        <ClientePicker clientes={clientes} clienteId={clienteId} onChange={setClienteId} />
      </div>

      {lines.map((line) => (
        <div key={line.id} className="flex items-start gap-2">
          <div className="flex-1 space-y-1.5">
            <Label className="block h-5 leading-5">Forma de pagamento</Label>
            <Select
              value={line.forma_pagamento_id}
              onValueChange={(value) => value && updateLine(line.id, { forma_pagamento_id: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() =>
                    formasPagamento.find((f) => f.id === line.forma_pagamento_id)?.nome ??
                    "Selecione"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {formasPagamento.map((forma) => (
                  <SelectItem key={forma.id} value={forma.id}>
                    {forma.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1.5">
            <Label className="block h-5 leading-5">Valor</Label>
            <CurrencyInput value={line.valor} onChange={(valor) => updateLine(line.id, { valor })} />
          </div>
          {lines.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remover forma de pagamento"
              className="mt-7"
              onClick={() => removeLine(line.id)}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addLine}>
        <Plus className="size-3.5" />
        Dividir pagamento
      </Button>

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Restante</span>
        <span className={restante === 0 ? "text-foreground" : "font-medium text-destructive"}>
          {formatCurrency(restante)}
        </span>
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={restante !== 0 || submitting || items.length === 0}
        onClick={handleFinalizar}
      >
        {submitting ? "Finalizando..." : "Finalizar venda"}
      </Button>
    </div>
  );
}

export function PaymentDialog({
  open,
  onOpenChange,
  items,
  desconto,
  formasPagamento,
  clientes,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  desconto: number;
  formasPagamento: FormaPagamento[];
  clientes: ClientePdv[];
  onSuccess: () => void;
}) {
  const subtotal = items.reduce((sum, i) => sum + i.produto.preco_venda * i.quantidade, 0);
  const total = Math.max(subtotal - desconto, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-4" />
            Pagamento — {formatCurrency(total)}
          </DialogTitle>
        </DialogHeader>

        {open && (
          <PaymentForm
            items={items}
            desconto={desconto}
            formasPagamento={formasPagamento}
            clientes={clientes}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
