type OTPRecord = { userId: string; email: string; otp: string };

class InMemoryStore {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
    setTimeout(() => this.delete(key), ttlSeconds * 1000).unref?.();
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

let useRedis = false;
let redisClient: any = null;

const REDIS_URL = process.env.REDIS_URL;
if (REDIS_URL) {
  try {
    const IORedis = require("ioredis");
    redisClient = new IORedis(REDIS_URL);
    useRedis = true;
  } catch (e) {
    useRedis = false;
  }
}

const memory = new InMemoryStore();

export async function setOTP(key: string, record: OTPRecord, ttlSeconds = 600) {
  const value = JSON.stringify(record);
  if (useRedis && redisClient) {
    await redisClient.set(key, value, "EX", ttlSeconds);
  } else {
    await memory.set(key, value, ttlSeconds);
  }
}

export async function getOTP(key: string): Promise<OTPRecord | null> {
  let raw: string | null = null;
  if (useRedis && redisClient) {
    raw = await redisClient.get(key);
  } else {
    raw = await memory.get(key);
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OTPRecord;
  } catch {
    return null;
  }
}

export async function deleteOTP(key: string) {
  if (useRedis && redisClient) {
    await redisClient.del(key);
  } else {
    await memory.delete(key);
  }
}

export type { OTPRecord };
