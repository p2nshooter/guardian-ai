/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
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
