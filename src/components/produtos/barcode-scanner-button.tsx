"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Native BarcodeDetector isn't in the DOM lib typings yet.
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }
}

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

function subscribeNever() {
  return () => {};
}
function getSupportSnapshot() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}
function getServerSupportSnapshot() {
  return false;
}

export function BarcodeScannerButton({ onDetected }: { onDetected: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = useSyncExternalStore(
    subscribeNever,
    getSupportSnapshot,
    getServerSupportSnapshot,
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new window.BarcodeDetector!({ formats: FORMATS });

        const loop = async () => {
          if (!videoRef.current || cancelled) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onDetected(codes[0].rawValue);
              setOpen(false);
              return;
            }
          } catch {
            // transient decode errors are expected between frames
          }
          frameRef.current = requestAnimationFrame(loop);
        };
        frameRef.current = requestAnimationFrame(loop);
      } catch {
        if (!cancelled) setError("Não foi possível acessar a câmera.");
      }
    }

    start();

    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, onDetected]);

  if (!supported) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Ler código de barras pela câmera"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <ScanLine className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ler código de barras</DialogTitle>
            <DialogDescription>Aponte a câmera para o código de barras do produto.</DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : (
            <div className="relative overflow-hidden rounded-lg bg-black">
              <video ref={videoRef} className="aspect-video w-full" muted playsInline />
              <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-gold" />
            </div>
          )}
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="gap-1.5">
            <X className="size-4" />
            Cancelar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
