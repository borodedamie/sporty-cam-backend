import http from "http";
import logger from "../utils/logger";
import { supabaseAdmin } from "./supabase";

let io: any = null;
let nsp: any = null;

export function initSocket(server: http.Server) {
  if (io) return io;
  try {
    const { Server } = require("socket.io");
    io = new Server(server, {
      cors: true,
    });

    nsp = io.of("/ws-inapp");

    nsp.use(async (socket: any, next: any) => {
      try {
        let token =
          socket.handshake?.auth?.token ||
          socket.handshake?.headers?.authorization ||
          socket.handshake?.query?.token ||
          socket.handshake?.query?.authorization;
        if (!token) return next(new Error("Unauthorized"));

        if (typeof token === "string" && token.startsWith("Bearer ")) {
          token = token.slice(7);
        }

        try {
          const { supabase } = require("../lib/supabase");
          const { data, error } = await supabase.auth.getUser(token);
          if (error || !data?.user) return next(new Error("Unauthorized"));
          socket.data.user = { id: data.user.id, email: data.user.email };
          return next();
        } catch (sbErr) {
          return next(new Error("Unauthorized"));
        }
      } catch (err) {
        return next(new Error("Unauthorized"));
      }
    });

    nsp.on("connection", (socket: any) => {
      const userId =
        socket.data?.user?.id ||
        socket.handshake?.auth?.user_id ||
        socket.handshake?.query?.user_id;
      if (!userId) {
        logger.warn(
          "Socket connection missing user_id after auth; disconnecting"
        );
        socket.disconnect(true);
        return;
      }

      const room = `user:${userId}`;
      socket.join(room);

      logger.info(
        `Socket connected user=${userId} room=${room} socketId=${socket.id}`
      );

      socket.on("disconnect", (reason: any) => {
        logger.debug(`Socket disconnected for user ${userId}: ${reason}`);
      });

      socket.on("mark_read", async (payload: any, ack?: (res: any) => void) => {
        try {
          const id = typeof payload === "string" ? payload : payload?.id;
          if (!id) {
            const resp = { ok: false, message: "missing id" };
            if (typeof ack === "function") return ack(resp);
            return;
          }

          const user = socket.data?.user;
          const userIdForSocket =
            user?.id ||
            socket.handshake?.auth?.user_id ||
            socket.handshake?.query?.user_id;
          if (!userIdForSocket) {
            const resp = { ok: false, message: "unauthorized" };
            if (typeof ack === "function") return ack(resp);
            return;
          }

          if (!supabaseAdmin) {
            logger.error(
              "supabaseAdmin not configured; cannot mark notification read"
            );
            const resp = { ok: false, message: "server misconfiguration" };
            if (typeof ack === "function") return ack(resp);
            return;
          }

          const { data, error } = await supabaseAdmin
            .from("notifications")
            .update({
              is_read: true,
              last_attempt_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("user_id", userIdForSocket)
            .select()
            .maybeSingle();

          if (error) {
            logger.error("socket mark_read error:", error);
            const resp = { ok: false, message: error.message };
            if (typeof ack === "function") return ack(resp);
            return;
          }

          if (!data) {
            const resp = { ok: false, message: "notification not found or not authorized" };
            if (typeof ack === "function") return ack(resp);
            return;
          }

          const room = `user:${userIdForSocket}`;
          const emitter = nsp || io;
          emitter.to(room).emit("notification_read", {
            id,
            notification: data,
          });

          const resp = { ok: true, data };
          if (typeof ack === "function") return ack(resp);
          return;
        } catch (err) {
          logger.error("socket mark_read unexpected error:", err);
          if (typeof ack === "function")
            return ack({
              ok: false,
              message: (err && err.message) || String(err),
            });
        }
      });
    });

    logger.info("Socket.io server initialized");
    return io;
  } catch (err: any) {
    logger.warn(
      "socket.io not installed or failed to init:",
      err.message || err
    );
    return null;
  }
}

export function sendInAppNotification(userId: string, payload: any) {
  if (!io) return false;
  try {
    const room = `user:${userId}`;
    const emitter = nsp || io;

    let recipients = 0;
    try {
      const rooms = (emitter as any).adapter?.rooms;
      if (rooms && typeof rooms.get === "function") {
        const r = rooms.get(room);
        recipients = r ? r.size || 0 : 0;
      } else if (rooms && rooms[room]) {
        recipients = Array.isArray(rooms[room])
          ? rooms[room].length
          : (rooms[room] && rooms[room].length) || 0;
      }
    } catch (e) {
      recipients = 0;
    }

    logger.info(`socket.emit -> room=${room} recipients=${recipients}`);
    emitter.to(room).emit("notification", payload);
    return recipients > 0;
  } catch (err) {
    logger.error("Failed to emit socket.io notification", err);
    return false;
  }
}

export function getRoomRecipientCount(userId: string) {
  if (!io) return 0;
  try {
    const room = `user:${userId}`;
    const emitter = nsp || io;
    const rooms = (emitter as any).adapter?.rooms;
    if (rooms && typeof rooms.get === "function") {
      const r = rooms.get(room);
      return r ? r.size || 0 : 0;
    } else if (rooms && rooms[room]) {
      return Array.isArray(rooms[room])
        ? rooms[room].length
        : (rooms[room] && rooms[room].length) || 0;
    }
    return 0;
  } catch (err) {
    return 0;
  }
}

export function broadcast(payload: any) {
  if (!io) return;
  const emitter = nsp || io;
  emitter.emit("broadcast", payload);
}

export function emitNotificationRead(userId: string, payload: any) {
  if (!io) return;
  try {
    const room = `user:${userId}`;
    const emitter = nsp || io;
    emitter.to(room).emit("notification_read", payload);
  } catch (err) {
    logger.error("emitNotificationRead failed", err);
  }
}

export default {
  initSocket,
  sendInAppNotification,
  broadcast,
};
