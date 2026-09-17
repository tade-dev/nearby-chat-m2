import {
  MQTT_PREFIX,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_TTL_MS,
} from "./config";
import type { RoomMeta } from "./types";

export function generateRoomCode(
  randomBytes: (n: number) => Uint8Array = defaultRandomBytes
): string {
  const bytes = randomBytes(ROOM_CODE_LENGTH);
  let out = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    out += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length];
  }
  return out;
}

function defaultRandomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false;
  return [...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch));
}

export function topics(code: string) {
  const base = `${MQTT_PREFIX}/${code}`;
  return {
    meta: `${base}/meta`,
    chat: `${base}/chat`,
    presenceBase: `${base}/presence`,
    presenceAll: `${base}/presence/+`,
    presenceUser: (clientId: string) => `${base}/presence/${clientId}`,
  };
}

export function createRoomMeta(code: string, hostClientId: string, now = Date.now()): RoomMeta {
  return {
    v: 1,
    code,
    createdAt: now,
    expiresAt: now + ROOM_TTL_MS,
    status: "active",
    hostClientId,
  };
}

export function parseMeta(payload: string): RoomMeta | null {
  try {
    const data = JSON.parse(payload) as Partial<RoomMeta>;
    if (data?.v !== 1 || typeof data.code !== "string") return null;
    if (typeof data.createdAt !== "number" || typeof data.expiresAt !== "number") return null;
    if (data.status !== "active" && data.status !== "ended") return null;
    if (typeof data.hostClientId !== "string") return null;
    return data as RoomMeta;
  } catch {
    return null;
  }
}

export function roomJoinError(meta: RoomMeta | null, now = Date.now()): string | null {
  if (!meta) return "Room not found. Check the code or scan a live QR.";
  if (meta.status === "ended") return "This room was ended by the host and cannot be rejoined.";
  if (now >= meta.expiresAt) return "This room has expired and cannot be rejoined.";
  return null;
}

export function formatRemaining(expiresAt: number, now = Date.now()): string {
  const ms = Math.max(0, expiresAt - now);
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function sanitizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 20);
}

export function sanitizeText(raw: string): string {
  return raw.trim().slice(0, 500);
}
