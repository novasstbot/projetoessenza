// Camada de decodificação de código de barras, isolada da captura de câmera
// (ver camera.ts). Hoje implementada com a API nativa BarcodeDetector; a
// ideia de existir essa camada é permitir trocar o motor de leitura (ex.:
// ZXing) no futuro sem precisar tocar no componente que controla a câmera.

export type BarcodeDecoder = {
  readonly supportedFormats: string[];
  decode(source: CanvasImageSource): Promise<string | null>;
};

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorConstructor = {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats: () => Promise<string[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

const FORMATOS_DESEJADOS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

export function isNativeBarcodeDetectorAvailable(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

// Só cria o decoder com os formatos que o navegador de fato confirma via
// getSupportedFormats — pedir um formato não suportado faz o construtor do
// BarcodeDetector lançar erro. Se nem EAN-13 nem EAN-8 estiverem
// disponíveis, não há por que criar o decoder.
export async function createNativeBarcodeDecoder(): Promise<BarcodeDecoder | null> {
  if (!isNativeBarcodeDetectorAvailable()) return null;

  const disponiveis = await window.BarcodeDetector!.getSupportedFormats();
  const formats = FORMATOS_DESEJADOS.filter((formato) => disponiveis.includes(formato));

  if (!formats.includes("ean_13") && !formats.includes("ean_8")) {
    return null;
  }

  const detector = new window.BarcodeDetector!({ formats });

  return {
    supportedFormats: formats,
    async decode(source) {
      const codes = await detector.detect(source);
      return codes[0]?.rawValue ?? null;
    },
  };
}
