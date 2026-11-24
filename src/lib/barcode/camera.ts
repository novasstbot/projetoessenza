// Camada de câmera, isolada da lógica de reconhecimento de código de barras
// (ver decoder.ts). Responsável só por abrir a câmera traseira, tentar
// manter o foco contínuo quando o aparelho suportar, e expor a resolução
// efetiva do vídeo.

export type RearCamera = {
  stream: MediaStream;
  track: MediaStreamTrack | null;
  stop: () => void;
};

export async function startRearCamera(): Promise<RearCamera> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  });

  return {
    stream,
    track: stream.getVideoTracks()[0] ?? null,
    stop: () => stream.getTracks().forEach((t) => t.stop()),
  };
}

type FocusCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  focusDistance?: { min: number; max: number; step: number };
};

// "continuous" nem sempre refocaliza em objetos muito próximos, mas sem
// pedir isso explicitamente alguns celulares não refocalizam depois do
// primeiro frame — ficam parados na distância em que a câmera abriu.
// Retorna se o pedido foi feito, para quem chama saber se há suporte.
export function enableContinuousFocus(track: MediaStreamTrack | null): boolean {
  if (!track) return false;
  const capabilities = track.getCapabilities?.() as FocusCapabilities | undefined;
  if (!capabilities?.focusMode?.includes("continuous")) return false;

  track
    .applyConstraints({
      advanced: [{ focusMode: "continuous" } as unknown as MediaTrackConstraintSet],
    })
    .catch(() => {});
  return true;
}

export type FocusDistanceRange = { min: number; max: number; step: number };

// Alguns aparelhos só expõem "manual" (sem "continuous") — ou seja, não
// focalizam automaticamente: é preciso definir a distância de foco na mão.
// A direção perto/longe da escala varia por aparelho, então quem usa isso
// deve deixar o usuário ajustar olhando a imagem, em vez de supor um valor.
export function getManualFocusRange(track: MediaStreamTrack | null): FocusDistanceRange | null {
  if (!track) return null;
  const capabilities = track.getCapabilities?.() as FocusCapabilities | undefined;
  if (!capabilities?.focusMode?.includes("manual") || !capabilities.focusDistance) return null;
  return capabilities.focusDistance;
}

// Retorna o valor que a câmera de fato confirma ter aplicado (via
// getSettings, depois do applyConstraints resolver) — não o valor pedido.
// Em alguns aparelhos/navegadores o pedido é aceito sem erro mas ignorado
// pelo driver, e sem checar aqui não dá pra distinguir isso de "o valor foi
// aplicado mas a lente não focaliza nessa distância".
export async function setManualFocusDistance(
  track: MediaStreamTrack | null,
  value: number,
): Promise<number | null> {
  if (!track) return null;
  try {
    await track.applyConstraints({
      advanced: [
        { focusMode: "manual", focusDistance: value } as unknown as MediaTrackConstraintSet,
      ],
    });
  } catch {
    return null;
  }
  const settings = track.getSettings?.() as (MediaTrackSettings & { focusDistance?: number }) | undefined;
  return settings?.focusDistance ?? null;
}

// Para diagnóstico: diz quais modos de foco a API expõe nesse aparelho/
// navegador. Se vier null ou vazio, o foco não pode ser controlado via Web
// APIs — qualquer problema de nitidez de perto é uma limitação de
// hardware/driver, não algo que código resolva.
export function getFocusModes(track: MediaStreamTrack | null): string[] | null {
  if (!track) return null;
  const capabilities = track.getCapabilities?.() as FocusCapabilities | undefined;
  return capabilities?.focusMode ?? null;
}

export function getEffectiveResolution(
  video: HTMLVideoElement,
): { width: number; height: number } | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  return { width: video.videoWidth, height: video.videoHeight };
}
