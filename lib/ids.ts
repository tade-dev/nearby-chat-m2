const CLIENT_KEY = "ncm2-client-id";

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  // sessionStorage so each browser tab is a distinct person (2–3 tab testing).
  let id = window.sessionStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

export function hostStorageKey(code: string): string {
  return `ncm2-host:${code}`;
}

export function nameStorageKey(code: string): string {
  return `ncm2-name:${code}`;
}

export function isHostOf(code: string, _clientId?: string): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(hostStorageKey(code)) === "1";
}

export function markHost(code: string, _clientId?: string): void {
  window.sessionStorage.setItem(hostStorageKey(code), "1");
}

export function savedName(code: string): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(nameStorageKey(code)) || "";
}

export function saveName(code: string, name: string): void {
  window.sessionStorage.setItem(nameStorageKey(code), name);
}
