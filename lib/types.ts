export type RoomStatus = "active" | "ended";

export type RoomMeta = {
  v: 1;
  code: string;
  createdAt: number;
  expiresAt: number;
  status: RoomStatus;
  hostClientId: string;
};

export type PresenceEntry = {
  clientId: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
};

export type ChatMessage = {
  id: string;
  clientId: string;
  name: string;
  text: string;
  ts: number;
};
