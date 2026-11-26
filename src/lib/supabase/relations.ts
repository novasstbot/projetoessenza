// Relação "muitos-pra-um" embutida via `!inner` sem types gerados do banco:
// o supabase-js às vezes infere o tipo como array, mas o Postgrest sempre
// devolve objeto único nesse caso — aceita os dois formatos em runtime.
export function unwrapRelacao<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}
