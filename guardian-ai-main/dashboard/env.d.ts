/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    DB:  D1Database;
    KV:  KVNamespace;
    R2:  R2Bucket;
  }

  // Override json() to return any (avoids strict 'unknown' type errors)
  interface Body {
    json(): Promise<any>;
  }
  interface Request {
    json(): Promise<any>;
  }
  interface Response {
    json(): Promise<any>;
  }
}

export {};
