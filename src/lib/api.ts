export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const tauri = (window as unknown as { __TAURI__?: { core?: { invoke: <R>(c: string, a?: Record<string, unknown>) => Promise<R> } } }).__TAURI__;
  if (tauri?.core?.invoke) {
    return tauri.core.invoke<T>(cmd, args);
  }
  throw new Error("Tauri API unavailable");
}
