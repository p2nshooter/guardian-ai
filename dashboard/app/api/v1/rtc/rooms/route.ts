/* AXTO Connect — WebRTC rooms (peer-to-peer audio, video and data)
 *   POST /api/v1/rtc/rooms {room?}  → {room, channel, iceServers, turn}
 * Signalling runs over the event log: publish offer / answer / candidate / join /
 * leave on the room's channel (POST /api/v1/events or the WebSocket) and receive
 * them with SSE, WebSocket or long polling. Media flows directly between peers;
 * STUN is always included, TURN when the operator has configured it. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { withCaller } from "@/lib/connect/route";
import { apiJson, preflight } from "@/lib/connect/http";
import { requireScope, ConnectError } from "@/lib/connect/auth";
import { iceServers } from "@/lib/connect/settings";
import { readJson } from "@/lib/http";

export const OPTIONS = (req: NextRequest) => preflight(req, "POST, OPTIONS");

export async function POST(req: NextRequest) {
  return withCaller(req, async (c) => {
    requireScope(c, "rtc");
    const b = await readJson(req);
    let room = typeof b?.room === "string" ? b.room.trim() : "";
    if (room && !/^[A-Za-z0-9_-]{4,40}$/.test(room)) throw new ConnectError("Room names are 4–40 letters, digits, _ or -.", 400, "invalid_argument");
    if (!room) room = Array.from(crypto.getRandomValues(new Uint8Array(9)), (x) => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join("");
    const ice = await iceServers(req, 3600);
    return apiJson(req, c, { room, channel: `rtc.${room}`, ...ice }, 201);
  }, { allowSession: true });
}
