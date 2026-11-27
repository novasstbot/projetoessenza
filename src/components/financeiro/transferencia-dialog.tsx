"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  registrarTransferencia,
  registrarAporte,
  registrarRetirada,
} from "@/server/actions/financeiro/transferencias";
import {
  transferenciaSchema,
  aporteRetiradaSchema,
  type TransferenciaFormValues,
  type AporteRetiradaFormValues,
} from "@/modules/financeiro/schemas";
import type { ContaFinanceira } from "@/modules/financeiro/types";

type Operacao = "transferencia" | "aporte" | "retirada";

function ContaSelect({
  value,
  onChange,
  contas,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  contas: ContaFinanceira[];
  label: string;
}) {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue>{() => contas.find((c) => c.id === value)?.nome ?? "Selecione"}</SelectValue>
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
  );
}

function TransferenciaForm({ contas, onDone }: { contas: ContaFinanceira[]; onDone: () => void }) {
  const router = useRouter();
  const form = useForm<TransferenciaFormValues>({
    resolver: zodResolver(transferenciaSchema),
    defaultValues: { contaOrigemId: "", contaDestinoId: "", valor: 0, motivo: "" },
  });

  async function onSubmit(values: TransferenciaFormValues) {
    try {
      await registrarTransferencia(values);
      toast.success("Transferência registrada.");
      router.refresh();
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="contaOrigemId"
          render={({ field }) => (
            <ContaSelect value={field.value} onChange={field.onChange} contas={contas} label="De" />
          )}
        />
        <FormField
          control={form.control}
          name="contaDestinoId"
          render={({ field }) => (
            <ContaSelect value={field.value} onChange={field.onChange} contas={contas} label="Para" />
          )}
        />
        <FormField
          control={form.control}
          name="valor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor</FormLabel>
              <FormControl>
                <CurrencyInput value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="motivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo</FormLabel>
              <FormControl>
                <Input placeholder="Ex.: depósito do excedente do caixa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? "Registrando..." : "Transferir"}
        </Button>
      </form>
    </Form>
  );
}

function AporteRetiradaForm({
  contas,
  tipo,
  onDone,
}: {
  contas: ContaFinanceira[];
  tipo: "aporte" | "retirada";
  onDone: () => void;
}) {
  const router = useRouter();
  const form = useForm<AporteRetiradaFormValues>({
    resolver: zodResolver(aporteRetiradaSchema),
    defaultValues: { contaId: "", valor: 0, motivo: "" },
  });

  async function onSubmit(values: AporteRetiradaFormValues) {
    try {
      if (tipo === "aporte") {
        await registrarAporte(values);
        toast.success("Aporte registrado.");
      } else {
        await registrarRetirada(values);
        toast.success("Retirada registrada.");
      }
      router.refresh();
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="contaId"
          render={({ field }) => (
            <ContaSelect
              value={field.value}
              onChange={field.onChange}
              contas={contas}
              label={tipo === "aporte" ? "Conta de destino" : "Conta de origem"}
            />
          )}
        />
        <FormField
          control={form.control}
          name="valor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor</FormLabel>
              <FormControl>
                <CurrencyInput value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="motivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo</FormLabel>
              <FormControl>
                <Input
                  placeholder={tipo === "aporte" ? "Ex.: injeção de capital" : "Ex.: retirada de lucro"}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting
            ? "Registrando..."
            : tipo === "aporte"
              ? "Registrar aporte"
              : "Registrar retirada"}
        </Button>
      </form>
    </Form>
  );
}

export function TransferenciaDialog({ contas }: { contas: ContaFinanceira[] }) {
  const [open, setOpen] = useState(false);
  const [operacao, setOperacao] = useState<Operacao>("transferencia");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-1.5">
            <ArrowLeftRight className="size-4" />
            Transferência / Aporte / Retirada
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Movimentação entre contas</DialogTitle>
        </DialogHeader>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="xs"
            variant={operacao === "transferencia" ? "default" : "outline"}
            onClick={() => setOperacao("transferencia")}
          >
            Transferência
          </Button>
          <Button
            type="button"
            size="xs"
            variant={operacao === "aporte" ? "default" : "outline"}
            onClick={() => setOperacao("aporte")}
          >
            Aporte
          </Button>
          <Button
            type="button"
            size="xs"
            variant={operacao === "retirada" ? "default" : "outline"}
            onClick={() => setOperacao("retirada")}
          >
            Retirada
          </Button>
        </div>

        {operacao === "transferencia" && (
          <TransferenciaForm contas={contas} onDone={() => setOpen(false)} />
        )}
        {operacao === "aporte" && (
          <AporteRetiradaForm contas={contas} tipo="aporte" onDone={() => setOpen(false)} />
        )}
        {operacao === "retirada" && (
          <AporteRetiradaForm contas={contas} tipo="retirada" onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
