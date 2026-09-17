const CLIENT_KEY = "ncm2-client-id";

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

export function hostStorageKey(code: string): string {
  return `ncm2-host:${code}`;
}

export function nameStorageKey(code: string): string {
  return `ncm2-name:${code}`;
}

export function isHostOf(code: string, clientId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(hostStorageKey(code)) === clientId;
}

export function markHost(code: string, clientId: string): void {
  window.localStorage.setItem(hostStorageKey(code), clientId);
}

export function savedName(code: string): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(nameStorageKey(code)) || "";
}

export function saveName(code: string, name: string): void {
  window.sessionStorage.setItem(nameStorageKey(code), name);
}
