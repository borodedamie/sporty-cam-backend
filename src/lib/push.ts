import { getMessaging } from "./firebase";
import logger from "../utils/logger";

export async function sendPushToToken(
  token: string,
  payload: { title?: string; body?: string; data?: any }
) {
  const messaging = getMessaging();
  if (!messaging) {
    logger.warn("Firebase messaging not available; skipping push");
    return { ok: false, reason: "firebase-not-configured" };
  }

  const msg: any = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data:
      typeof payload.data === "object"
        ? JSON.parse(JSON.stringify(payload.data))
        : {},
  };

  try {
    const res = await messaging.send(msg);
    return { ok: true, result: res };
  } catch (err: any) {
    logger.error("sendPushToToken failed:", err.message || err);
    return { ok: false, reason: err.message || err };
  }
}
