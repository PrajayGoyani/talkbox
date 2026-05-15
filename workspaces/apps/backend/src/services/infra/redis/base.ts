import { REDIS_URL } from "@config/env";
import * as Sentry from "@sentry/bun";
import { Redis } from "ioredis";

export class RedisBaseService {
  public client: Redis | null = null;
  public subClient: Redis | null = null;
  public adapterPubClient: Redis | null = null;
  public adapterSubClient: Redis | null = null;
  private _isConnected = false;

  get isConnected() {
    return this._isConnected;
  }
  set isConnected(val: boolean) {
    this._isConnected = val;
  }

  protected lastFailOpenLogAt = 0;
  protected failOpenCount = 0;
  protected readonly FAIL_OPEN_LOG_INTERVAL = 60 * 1000;
  protected readonly FAIL_OPEN_ALERT_THRESHOLD = 5;

  constructor() {
    if (!REDIS_URL) {
      console.warn("[RedisBaseService] REDIS_URL not provided. Redis features will be disabled.");
      return;
    }

    try {
      this.client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        reconnectOnError: (err) => {
          const targetError = "READONLY";
          if (err.message.includes(targetError)) return true;
          return false;
        },
      });

      this.client.on("connect", () => {
        this._isConnected = true;
        this.failOpenCount = 0;
        console.log("[RedisBaseService] Connected to Redis.");
      });

      this.client.on("error", (err) => {
        console.error("[RedisBaseService] Redis Client Error:", err);
      });

      this.subClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      // Dedicated clients for Socket.IO Redis Adapter to avoid interference with custom Pub/Sub
      this.adapterPubClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
      });

      this.adapterSubClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
    } catch (err) {
      console.error("[RedisBaseService] Failed to initialize Redis:", err);
    }
  }

  async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
      }
      if (this.subClient) {
        await this.subClient.quit();
        this.subClient = null;
      }
      if (this.adapterPubClient) {
        await this.adapterPubClient.quit();
        this.adapterPubClient = null;
      }
      if (this.adapterSubClient) {
        await this.adapterSubClient.quit();
        this.adapterSubClient = null;
      }
      this.isConnected = false;
    } catch (err: any) {
      if (!err.message?.includes("closed")) {
        console.error("[RedisBaseService] Error during Redis cleanup:", err);
      }
    }
  }

  protected _logFailOpen(operation: string) {
    this.failOpenCount++;
    const now = Date.now();
    const shouldAlert =
      this.failOpenCount <= this.FAIL_OPEN_ALERT_THRESHOLD ||
      now - this.lastFailOpenLogAt > this.FAIL_OPEN_LOG_INTERVAL;

    if (shouldAlert) {
      if (this.failOpenCount > this.FAIL_OPEN_ALERT_THRESHOLD) {
        this.lastFailOpenLogAt = now;
      }

      Sentry.captureMessage(
        `[RedisService] Fail-open: Redis is disconnected during ${operation} (Total failures: ${this.failOpenCount})`,
        {
          level: "warning",
          tags: { service: "redis", operation: "fail-open", source: operation },
          extra: { totalFailures: this.failOpenCount },
        },
      );
    }
  }
}
