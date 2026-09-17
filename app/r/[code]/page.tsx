import RoomClient from "./RoomClient";
import { normalizeRoomCode } from "@/lib/room";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomClient code={normalizeRoomCode(code)} />;
}
