const SOCKET_IO_SCRIPT_ID = "socket-io-client-cdn";
const SOCKET_IO_SCRIPT_URL = "https://cdn.socket.io/4.7.5/socket.io.min.js";

const resolveSocketUrl = () => {
  const configuredApi = import.meta.env.VITE_API_URL || "/api";
  if (configuredApi.startsWith("http")) {
    return configuredApi.replace(/\/api\/?$/, "");
  }
  return window.location.origin;
};

export const loadSocketIoClient = () =>
  new Promise((resolve, reject) => {
    if (window.io) {
      resolve(window.io);
      return;
    }

    const existing = document.getElementById(SOCKET_IO_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.io));
      existing.addEventListener("error", () => reject(new Error("Failed to load socket.io client.")));
      return;
    }

    const script = document.createElement("script");
    script.id = SOCKET_IO_SCRIPT_ID;
    script.src = SOCKET_IO_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.io);
    script.onerror = () => reject(new Error("Failed to load socket.io client."));
    document.body.appendChild(script);
  });

export async function connectTrackingSocket(token) {
  const ioFactory = await loadSocketIoClient();
  if (!ioFactory || !token) {
    throw new Error("Socket client is unavailable.");
  }

  const socket = ioFactory(resolveSocketUrl(), {
    auth: { token },
    transports: ["websocket", "polling"]
  });

  return socket;
}

