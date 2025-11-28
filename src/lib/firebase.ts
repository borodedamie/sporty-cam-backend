import logger from "../utils/logger";

let admin: any = null;
let messaging: any = null;

export function initFirebase() {
  if (messaging) return messaging;

  try {
    admin = require("firebase-admin");

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL as string;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY as string;
    const projectId = process.env.FIREBASE_PROJECT_ID as string;

    privateKey = privateKey.replace(/\\n/g, "\n");
    const cred = {
      type: "service_account",
      project_id: projectId,
      private_key: privateKey,
      client_email: clientEmail,
    };
    admin.initializeApp({ credential: admin.credential.cert(cred) });

    messaging = admin.messaging();
    logger.info("Firebase initialized for push notifications");
    return messaging;
  } catch (err: any) {
    logger.warn(
      "Failed to init firebase-admin (not installed or misconfigured):",
      err.message || err
    );
    return null;
  }
}

export function getMessaging() {
  return messaging || initFirebase();
}
