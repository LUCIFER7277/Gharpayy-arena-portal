import { io, Socket } from "socket.io-client";
import { Platform } from "react-native";
import { getCachedUser, API_URL } from "./api-client";
import { getRoster } from "./roster";

let socket: Socket | null = null;

// Avoid circular import: message-store registers this callback after it loads
let _hydrateMessages: (() => void) | null = null;
export function registerHydrateMessages(fn: () => void) {
  _hydrateMessages = fn;
}

export function initSocket() {
  // Socket.IO needs a real network connection; skip on native if not configured
  if (Platform.OS !== "web" && !API_URL) return;
  if (socket) return; // already initialized

  // We connect to the same host that the API uses.
  // Extract the base URL from API_URL by removing /api at the end, if present
  const socketUrl = API_URL ? API_URL.replace(/\/api\/?$/, "") : "";

  socket = io(socketUrl, {
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on("connect", () => {
    console.log("[socket] Connected:", socket?.id);

    // Join room for this employee's possible identities
    const user = getCachedUser();
    if (user) {
      socket?.emit("join", user.id);
      if (user.employeeId) {
        socket?.emit("join", user.employeeId);
      }

      // If HR/Admin, actor might be resolved by email
      const roster = getRoster();
      const actor =
        roster.find((e) => e.id === user.employeeId) ||
        roster.find((e) => (e as any).email === user.email);
      if (actor && actor.id !== user.id && actor.id !== user.employeeId) {
        socket?.emit("join", actor.id);
      }
    }
  });

  socket.on("chat_update", () => {
    console.log("[socket] Received chat_update");
    // Hydrate messages immediately when we get a real-time ping!
    _hydrateMessages?.();
  });

  socket.on("disconnect", () => {
    console.log("[socket] Disconnected");
  });
}

export function notifyChat(targetIds: string[]) {
  if (!socket?.connected) return;
  socket.emit("notify_chat", { targetIds });
}
