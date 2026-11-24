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

type FocusCapabilities = MediaTrackCapabilities & { focusMode?: string[] };

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

export function getEffectiveResolution(
  video: HTMLVideoElement,
): { width: number; height: number } | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  return { width: video.videoWidth, height: video.videoHeight };
}
