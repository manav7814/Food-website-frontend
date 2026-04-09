import { useEffect, useRef } from "react";
import { connectTrackingSocket } from "../services/socketClient";

export default function useOrderTrackingSocket({ orderId, onTrackingUpdate }) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !orderId) return undefined;
    let isCancelled = false;

    const connect = async () => {
      try {
        const socket = await connectTrackingSocket(token);
        if (isCancelled) {
          socket.disconnect();
          return;
        }

        socketRef.current = socket;
        socket.emit("tracking:join-order", orderId);
        socket.on("order:tracking", onTrackingUpdate);
        socket.on("order:driver-location", onTrackingUpdate);
      } catch {
        // Poll fallback already exists in pages.
      }
    };

    connect();

    return () => {
      isCancelled = true;
      if (socketRef.current) {
        socketRef.current.emit("tracking:leave-order", orderId);
        socketRef.current.off("order:tracking", onTrackingUpdate);
        socketRef.current.off("order:driver-location", onTrackingUpdate);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [onTrackingUpdate, orderId]);
}

