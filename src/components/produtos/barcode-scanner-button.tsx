"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createNativeBarcodeDecoder } from "@/lib/barcode/decoder";

// Ler direto do stream de vídeo da câmera (getUserMedia) depende do
// navegador conseguir focalizar o preview em tempo real — e em vários
// aparelhos isso não funciona bem o suficiente pra um código de barras
// pequeno, mesmo tentando controlar o foco pela Web API (testado e sem
// sucesso). O app de câmera nativo do celular tem autofoco por toque de
// verdade, então aqui tiramos uma foto parada com ele e decodificamos essa
// foto, em vez de tentar ler o vídeo ao vivo.
export function BarcodeScannerButton({ onDetected }: { onDetected: (code: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const decoder = await createNativeBarcodeDecoder();
      if (!decoder) {
        setError("Este navegador não tem leitura de código de barras (EAN) disponível.");
        return;
      }

      const bitmap = await createImageBitmap(file);
      try {
        const value = await decoder.decode(bitmap);
        if (value) {
          onDetected(value);
        } else {
          setError(
            "Não encontrei um código de barras nessa foto. Tire outra, bem focada e próxima do código.",
          );
        }
      } finally {
        bitmap.close();
      }
    } catch {
      setError("Não foi possível ler essa foto.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFile(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Ler código de barras pela câmera"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
      </Button>

      <Dialog open={error != null} onOpenChange={() => setError(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Leitura não encontrada</DialogTitle>
            <DialogDescription>{error}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setError(null);
                inputRef.current?.click();
              }}
            >
              Tirar outra foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
