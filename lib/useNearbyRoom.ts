"use client";

import mqtt, { type MqttClient } from "mqtt";
import { useCallback, useEffect, useRef, useState } from "react";
import { MQTT_URL } from "./config";
import {
  getClientId,
  isHostOf,
  saveName,
  savedName,
} from "./ids";
import {
  createRoomMeta,
  parseMeta,
  roomJoinError,
  sanitizeName,
  sanitizeText,
  topics,
} from "./room";
import type { ChatMessage, PresenceEntry, RoomMeta } from "./types";

export type Phase = "connecting" | "need-name" | "in-room" | "blocked";

type State = {
  phase: Phase;
  blockReason: string | null;
  meta: RoomMeta | null;
  people: PresenceEntry[];
  messages: ChatMessage[];
  clientId: string;
  name: string;
  isHost: boolean;
  connected: boolean;
};

const initial: Omit<State, "clientId" | "isHost"> & { clientId: string; isHost: boolean } = {
  phase: "connecting",
  blockReason: null,
  meta: null,
  people: [],
  messages: [],
  clientId: "",
  name: "",
  isHost: false,
  connected: false,
};

export function useNearbyRoom(code: string) {
  const [state, setState] = useState<State>(initial);
  const clientRef = useRef<MqttClient | null>(null);
  const metaRef = useRef<RoomMeta | null>(null);
  const peopleRef = useRef<Map<string, PresenceEntry>>(new Map());
  const joinedRef = useRef(false);
  const nameRef = useRef("");
  const hostRef = useRef(false);
  const clientIdRef = useRef("");

  const publishPresence = useCallback((client: MqttClient, name: string) => {
    const t = topics(code);
    const entry: PresenceEntry = {
      clientId: clientIdRef.current,
      name,
      isHost: hostRef.current,
      joinedAt: Date.now(),
    };
    client.publish(t.presenceUser(clientIdRef.current), JSON.stringify(entry), {
      qos: 1,
      retain: true,
    });
  }, [code]);

  const enterWithName = useCallback(
    (rawName: string) => {
      const name = sanitizeName(rawName);
      if (name.length < 1) return { ok: false as const, error: "Enter a display name." };
      const err = roomJoinError(metaRef.current);
      if (err) {
        setState((s) => ({ ...s, phase: "blocked", blockReason: err }));
        return { ok: false as const, error: err };
      }
      saveName(code, name);
      nameRef.current = name;
      joinedRef.current = true;
      const client = clientRef.current;
      if (client?.connected) publishPresence(client, name);
      setState((s) => ({ ...s, name, phase: "in-room" }));
      return { ok: true as const };
    },
    [code, publishPresence]
  );

  const sendMessage = useCallback(
    (raw: string) => {
      const text = sanitizeText(raw);
      if (!text) return;
      const err = roomJoinError(metaRef.current);
      if (err || !joinedRef.current) return;
      const client = clientRef.current;
      if (!client?.connected) return;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        clientId: clientIdRef.current,
        name: nameRef.current,
        text,
        ts: Date.now(),
      };
      client.publish(topics(code).chat, JSON.stringify(msg), { qos: 1 });
    },
    [code]
  );

  const endRoom = useCallback(() => {
    if (!hostRef.current) return;
    const current = metaRef.current;
    if (!current) return;
    const next: RoomMeta = { ...current, status: "ended" };
    const client = clientRef.current;
    if (!client?.connected) return;
    client.publish(topics(code).meta, JSON.stringify(next), { qos: 1, retain: true });
  }, [code]);

  useEffect(() => {
    const clientId = getClientId();
    const isHost = isHostOf(code, clientId);
    const existingName = savedName(code);
    clientIdRef.current = clientId;
    hostRef.current = isHost;
    nameRef.current = existingName;
    joinedRef.current = false;
    metaRef.current = null;
    peopleRef.current = new Map();

    setState({
      ...initial,
      clientId,
      isHost,
      name: existingName,
      phase: "connecting",
    });

    const t = topics(code);
    const client = mqtt.connect(MQTT_URL, {
      clientId: `ncm2-${clientId.slice(0, 8)}-${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      keepalive: 30,
      reconnectPeriod: 2000,
      connectTimeout: 12_000,
      protocolVersion: 4,
      will: {
        topic: t.presenceUser(clientId),
        payload: "",
        retain: true,
        qos: 1,
      },
    });
    clientRef.current = client;

    let metaTimer: ReturnType<typeof setTimeout> | undefined;
    let expiryTimer: ReturnType<typeof setInterval> | undefined;

    const applyMeta = (meta: RoomMeta | null, { fromTimeout = false } = {}) => {
      metaRef.current = meta;
      const err = roomJoinError(meta);
      if (err) {
        joinedRef.current = false;
        setState((s) => ({
          ...s,
          meta,
          phase: "blocked",
          blockReason: err,
        }));
        return;
      }
      if (!meta) {
        if (fromTimeout && !isHost) {
          setState((s) => ({
            ...s,
            phase: "blocked",
            blockReason: "Room not found. Check the code or scan a live QR.",
          }));
        }
        return;
      }
      setState((s) => {
        if (s.phase === "blocked") return { ...s, meta };
        const named = Boolean(nameRef.current);
        if (named && !joinedRef.current && client.connected) {
          joinedRef.current = true;
          publishPresence(client, nameRef.current);
        }
        return {
          ...s,
          meta,
          phase: named ? "in-room" : "need-name",
          blockReason: null,
        };
      });
    };

    const applyPeople = () => {
      const people = [...peopleRef.current.values()].sort((a, b) => a.joinedAt - b.joinedAt);
      setState((s) => ({ ...s, people }));
    };

    client.on("connect", () => {
      setState((s) => ({ ...s, connected: true }));
      client.subscribe([t.meta, t.chat, t.presenceAll], { qos: 1 });
      if (isHost) {
        const meta = createRoomMeta(code, clientId);
        // Only publish if we don't already have retained meta; still publish so a
        // brand-new room exists. If retained meta arrives first, we keep it.
        setTimeout(() => {
          if (!metaRef.current) {
            client.publish(t.meta, JSON.stringify(meta), { qos: 1, retain: true });
            applyMeta(meta);
          } else if (metaRef.current.status === "active") {
            applyMeta(metaRef.current);
          }
        }, 400);
      } else {
        metaTimer = setTimeout(() => {
          if (!metaRef.current) applyMeta(null, { fromTimeout: true });
        }, 8000);
      }
    });

    client.on("reconnect", () => {
      setState((s) => ({ ...s, connected: false }));
    });

    client.on("message", (topic, payloadBuf) => {
      const payload = payloadBuf.toString();
      if (topic === t.meta) {
        const meta = payload ? parseMeta(payload) : null;
        applyMeta(meta);
        return;
      }
      if (topic === t.chat) {
        if (!payload) return;
        try {
          const msg = JSON.parse(payload) as ChatMessage;
          if (!msg?.id || !msg.text) return;
          setState((s) => {
            if (s.messages.some((m) => m.id === msg.id)) return s;
            return { ...s, messages: [...s.messages, msg].slice(-200) };
          });
        } catch {
          /* ignore */
        }
        return;
      }
      if (topic.startsWith(`${t.presenceBase}/`)) {
        const pid = topic.slice(t.presenceBase.length + 1);
        if (!payload) {
          peopleRef.current.delete(pid);
        } else {
          try {
            const entry = JSON.parse(payload) as PresenceEntry;
            if (entry?.clientId && entry.name) peopleRef.current.set(entry.clientId, entry);
          } catch {
            /* ignore */
          }
        }
        applyPeople();
      }
    });

    client.on("error", () => {
      /* mqtt.js reconnects; surface disconnect via connected flag */
    });

    expiryTimer = setInterval(() => {
      const meta = metaRef.current;
      if (!meta) return;
      const err = roomJoinError(meta);
      if (err) applyMeta(meta);
    }, 1000);

    return () => {
      if (metaTimer) clearTimeout(metaTimer);
      if (expiryTimer) clearInterval(expiryTimer);
      joinedRef.current = false;
      try {
        client.publish(t.presenceUser(clientId), "", { qos: 1, retain: true });
      } catch {
        /* ignore */
      }
      client.end(true);
      clientRef.current = null;
    };
  }, [code, publishPresence]);

  return { ...state, enterWithName, sendMessage, endRoom };
}
