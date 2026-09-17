"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ROOM_TTL_MINUTES } from "@/lib/config";
import { getClientId, markHost } from "@/lib/ids";
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from "@/lib/room";

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  function createRoom() {
    const code = generateRoomCode();
    markHost(code, getClientId());
    router.push(`/r/${code}`);
  }

  function join(e: FormEvent) {
    e.preventDefault();
    const code = normalizeRoomCode(joinCode);
    if (!isValidRoomCode(code)) {
      setError("Enter a 6-character room code.");
      return;
    }
    router.push(`/r/${code}`);
  }

  return (
    <main className="wrap">
      <h1>Nearby Chat M2</h1>
      <p className="lede">
        Temporary anonymous rooms for people in the same place. No accounts.
        Rooms automatically expire after <strong>{ROOM_TTL_MINUTES} minutes</strong>.
        The host can end a room sooner. Ended or expired rooms cannot be rejoined.
      </p>

      <section className="card">
        <h2>Create a room</h2>
        <p className="muted">You become the host. Share the QR code or room code.</p>
        <button data-testid="create-room" onClick={createRoom}>
          Create a temporary room
        </button>
      </section>

      <section className="card">
        <h2>Join a room</h2>
        <form onSubmit={join}>
          <label htmlFor="join-code">Room code</label>
          <div className="row">
            <input
              id="join-code"
              data-testid="join-code-input"
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="e.g. K7H2NQ"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(normalizeRoomCode(e.target.value));
                setError("");
              }}
            />
            <button data-testid="join-button" type="submit">
              Join
            </button>
          </div>
        </form>
        {error ? <p className="error">{error}</p> : null}
        <p className="muted">Or scan the host’s QR code — it opens this same join page.</p>
      </section>

      <p className="footer-note">
        Disposable Active Studios OS experiment. Not for sensitive conversation.
        Realtime uses a public MQTT broker (documented in README).
      </p>
    </main>
  );
}
