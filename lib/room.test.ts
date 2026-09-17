import { describe, expect, it } from "vitest";
import { ROOM_CODE_LENGTH, ROOM_TTL_MS } from "./config";
import {
  createRoomMeta,
  formatRemaining,
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
  parseMeta,
  roomJoinError,
  sanitizeName,
  topics,
} from "./room";

describe("room codes", () => {
  it("generates a 6-character code from the alphabet", () => {
    const code = generateRoomCode(() => new Uint8Array([1, 2, 3, 4, 5, 6]));
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
    expect(isValidRoomCode(code)).toBe(true);
  });

  it("normalizes typed codes", () => {
    expect(normalizeRoomCode(" ab-cd ef ")).toBe("ABCDEF");
    expect(normalizeRoomCode("k7h2nq")).toBe("K7H2NQ");
  });
});

describe("join rules", () => {
  const meta = createRoomMeta("ABCDEF", "host-1", 1_000_000);

  it("uses a 45-minute default TTL", () => {
    expect(ROOM_TTL_MS).toBe(45 * 60 * 1000);
    expect(meta.expiresAt - meta.createdAt).toBe(ROOM_TTL_MS);
  });

  it("allows an active unexpired room", () => {
    expect(roomJoinError(meta, meta.createdAt + 1000)).toBeNull();
  });

  it("blocks missing rooms", () => {
    expect(roomJoinError(null)).toMatch(/not found/i);
  });

  it("blocks ended rooms", () => {
    expect(roomJoinError({ ...meta, status: "ended" }, meta.createdAt + 1000)).toMatch(
      /ended by the host/i
    );
  });

  it("blocks expired rooms even if still marked active", () => {
    expect(roomJoinError(meta, meta.expiresAt)).toMatch(/expired/i);
    expect(roomJoinError(meta, meta.expiresAt + 1)).toMatch(/expired/i);
  });

  it("parses meta and rejects junk", () => {
    expect(parseMeta(JSON.stringify(meta))?.code).toBe("ABCDEF");
    expect(parseMeta("{")).toBeNull();
    expect(parseMeta(JSON.stringify({ v: 2 }))).toBeNull();
  });
});

describe("helpers", () => {
  it("formats remaining time", () => {
    expect(formatRemaining(60_000, 0)).toBe("1:00");
    expect(formatRemaining(1_500, 0)).toBe("0:01");
  });

  it("sanitizes names", () => {
    expect(sanitizeName("  Ada  Lovelace  extraaaaaaaaaaaaaaaaa")).toBe("Ada Lovelace extraaa");
  });

  it("scopes MQTT topics to the room code", () => {
    const t = topics("ABCDEF");
    expect(t.meta).toContain("/ABCDEF/meta");
    expect(t.presenceUser("c1")).toContain("/ABCDEF/presence/c1");
  });
});
