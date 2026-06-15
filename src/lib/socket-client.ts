import { io, Socket } from "socket.io-client";
import { getCachedUser } from "./api-client";
import { hydrateMessages } from "./message-store";

let socket: Socket | null = null;

export function initSocket() {
  if (typeof window === "undefined") return;
  if (socket) return; // already initialized

  // We connect to the same host that the API uses. 
  // In dev, the proxy handles `/socket.io/`, but it's safer to connect to the explicit API host if we have one.
  const apiUrl = import.meta.env.VITE_API_URL || "";
  
  socket = io(apiUrl, {
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
  });

  socket.on("connect", () => {
    console.log("[socket] Connected:", socket?.id);
    
    // Join room for this employee
    const user = getCachedUser();
    if (user?.employeeId) {
      socket?.emit("join", user.employeeId);
    }
  });

  socket.on("chat_update", () => {
    console.log("[socket] Received chat_update");
    // Hydrate messages immediately when we get a real-time ping!
    hydrateMessages();
  });

  socket.on("disconnect", () => {
    console.log("[socket] Disconnected");
  });
}

export function notifyChat(targetIds: string[]) {
  if (!socket?.connected) return;
  socket.emit("notify_chat", { targetIds });
}
