"use client";

import { QRCodeSVG } from "qrcode.react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ROOM_TTL_MINUTES } from "@/lib/config";
import { formatRemaining, isValidRoomCode } from "@/lib/room";
import { useNearbyRoom } from "@/lib/useNearbyRoom";

export default function RoomClient({ code }: { code: string }) {
  if (!isValidRoomCode(code)) {
    return (
      <main className="wrap">
        <h1>Invalid room code</h1>
        <p className="error" data-testid="blocked-reason">
          Room codes are 6 characters. Go back and try again.
        </p>
        <p>
          <a href="/">Home</a>
        </p>
      </main>
    );
  }

  return <RoomScreen code={code} />;
}

function RoomScreen({ code }: { code: string }) {
  const room = useNearbyRoom(code);
  const [name, setName] = useState(room.name);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/r/${code}`);
  }, [code]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = useMemo(() => {
    if (!room.meta) return "";
    return formatRemaining(room.meta.expiresAt, now);
  }, [room.meta, now]);

  function submitName(e: FormEvent) {
    e.preventDefault();
    room.enterWithName(name);
  }

  function send(e: FormEvent) {
    e.preventDefault();
    room.sendMessage(draft);
    setDraft("");
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  if (room.phase === "connecting") {
    return (
      <main className="wrap">
        <h1>Room {code}</h1>
        <p data-testid="connecting">Connecting…</p>
      </main>
    );
  }

  if (room.phase === "blocked") {
    return (
      <main className="wrap">
        <h1>Cannot join</h1>
        <p className="error" data-testid="blocked-reason">
          {room.blockReason}
        </p>
        <p className="muted">Ended or expired rooms cannot be rejoined.</p>
        <p>
          <a href="/">Create or join another room</a>
        </p>
      </main>
    );
  }

  if (room.phase === "need-name") {
    return (
      <main className="wrap">
        <h1>Join {code}</h1>
        <p className="muted">Pick an anonymous display name. No account is created.</p>
        <form className="card" onSubmit={submitName}>
          <label htmlFor="display-name">Display name</label>
          <div className="row">
            <input
              id="display-name"
              data-testid="name-input"
              type="text"
              maxLength={20}
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
            />
            <button data-testid="enter-room" type="submit">
              Enter room
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="topbar">
        <h1>Room {code}</h1>
        <p className="muted">
          <span className={`dot ${room.connected ? "on" : ""}`} />
          {room.connected ? "Live" : "Reconnecting"} · expires in{" "}
          <span data-testid="expiry">{remaining}</span> / {ROOM_TTL_MINUTES} min
        </p>
      </div>

      <section className="card">
        <h2>Share this room</h2>
        <p className="code" data-testid="room-code">
          {code}
        </p>
        <div className="row">
          <button className="secondary" type="button" onClick={copyCode}>
            {copied ? "Copied" : "Copy code"}
          </button>
          {room.isHost ? (
            <button data-testid="end-room" className="danger" type="button" onClick={room.endRoom}>
              End room
            </button>
          ) : null}
        </div>
        {joinUrl ? (
          <>
            <div className="qr" data-testid="qr">
              <QRCodeSVG value={joinUrl} size={180} includeMargin />
            </div>
            <p className="muted" data-testid="share-url">
              {joinUrl}
            </p>
          </>
        ) : null}
        {room.isHost ? <p className="muted">You are the host.</p> : null}
      </section>

      <section className="card">
        <h2>In this room ({room.people.length})</h2>
        <ul className="people" data-testid="presence-list">
          {room.people.map((p) => (
            <li key={p.clientId} data-testid={`person-${p.clientId}`}>
              {p.name}
              {p.clientId === room.clientId ? " (you)" : ""}
              {p.isHost ? " · host" : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Chat</h2>
        <div className="messages" data-testid="messages">
          {room.messages.map((m) => (
            <div className="msg" key={m.id}>
              <div className="who">
                {m.name}
                {m.clientId === room.clientId ? " (you)" : ""}
              </div>
              <div>{m.text}</div>
            </div>
          ))}
        </div>
        <form onSubmit={send}>
          <div className="row">
            <input
              data-testid="message-input"
              type="text"
              maxLength={500}
              placeholder="Message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button data-testid="send-message" type="submit">
              Send
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
