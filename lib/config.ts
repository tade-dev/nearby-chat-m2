/** Default room lifetime: 45 minutes. */
export const ROOM_TTL_MS = Number(
  process.env.NEXT_PUBLIC_ROOM_TTL_MS || 45 * 60 * 1000
);

export const ROOM_TTL_MINUTES = Math.round(ROOM_TTL_MS / 60000);

export const MQTT_URL =
  process.env.NEXT_PUBLIC_MQTT_URL || "wss://broker.emqx.io:8084/mqtt";

export const MQTT_PREFIX =
  process.env.NEXT_PUBLIC_MQTT_PREFIX || "tade-nearby-chat-m2";

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;
