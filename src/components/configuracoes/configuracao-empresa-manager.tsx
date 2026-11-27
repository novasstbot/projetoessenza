"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { CnpjCpfInput } from "@/components/ui/cnpj-cpf-input";
import { urlImagem } from "@/lib/produtos/imagem";
import {
  updateConfiguracaoEmpresa,
  uploadLogoEmpresa,
  type ConfiguracaoEmpresa,
} from "@/server/actions/configuracoes/empresa";

export function ConfiguracaoEmpresaManager({ empresa }: { empresa: ConfiguracaoEmpresa }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState(empresa.nome ?? "");
  const [cnpj, setCnpj] = useState(empresa.cnpj ?? "");
  const [endereco, setEndereco] = useState(empresa.endereco ?? "");
  const [telefone, setTelefone] = useState(empresa.telefone ?? "");
  const [email, setEmail] = useState(empresa.email ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);

  async function handleSalvar() {
    setSubmitting(true);
    try {
      await updateConfiguracaoEmpresa(empresa.id, { nome, cnpj, endereco, telefone, email });
      toast.success("Dados da empresa atualizados.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setEnviandoLogo(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("id", empresa.id);
      await uploadLogoEmpresa(formData);
      toast.success("Logo atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o logo.");
    } finally {
      setEnviandoLogo(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados da empresa</CardTitle>
        <p className="text-sm text-muted-foreground">
          Aparecem em recibos e relatórios impressos.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={enviandoLogo}
            onClick={() => inputRef.current?.click()}
            className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted disabled:opacity-60"
          >
            {empresa.logo_thumb ? (
              <img
                src={urlImagem(empresa.logo_thumb)}
                alt=""
                className="size-full object-contain"
              />
            ) : (
              <Upload className="size-5" />
            )}
          </button>
          <div>
            <p className="text-sm text-foreground">Logo</p>
            <p className="text-xs text-muted-foreground">
              {enviandoLogo ? "Enviando..." : "Clique no quadro pra enviar uma imagem"}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleLogo}
          />
        </div>

        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nome / razão social</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>CNPJ</Label>
            <CnpjCpfInput value={cnpj} onChange={setCnpj} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <PhoneInput value={telefone} onChange={setTelefone} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Endereço</Label>
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <Button type="button" size="sm" disabled={submitting} onClick={handleSalvar}>
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
}
