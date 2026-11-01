/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - AI workspace for legal, security & business teams
 * Maintained by: AXTO Digital Global <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * axto.io's records, in R2 (owner, 20 Oct 2026: "Database semuanya ke R2 ya,
 * jgn ada yg ke d1"). `getData()` is what every module calls: the collections
 * of lib/data/schema.ts on the private DATA bucket (`axto-data`), plus the
 * platform settings (k/config/<key>) and counters (n/<name>).
 *
 * Before the first record is read or written in an isolate, the one-time copy
 * from D1 must have happened (lib/data/migrate.ts). The bucket is wrapped so
 * every operation waits for that gate; after the first success the wait is a
 * resolved promise.
 * ============================================================================ */
import type { R2Like, R2ListOpts, R2PutOpts } from "../r2/bucket";
import { Store } from "../r2/store";
import { collections, type Collections } from "./schema";

export interface ConfigApi {
  /** The stored value of a platform setting, or null. */
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  /** Write only when the setting does not exist yet; true when this call wrote it. */
  setIfAbsent(key: string, value: string): Promise<boolean>;
  del(key: string): Promise<void>;
}

export type Data = Collections & { store: Store; config: ConfigApi };

interface ConfigDoc { value: string; updated_at: string }

function configApi(store: Store): ConfigApi {
  const name = (key: string) => `config/${key}`;
  return {
    async get(key) {
      const d = await store.getDoc<ConfigDoc | null>(name(key), null);
      return d ? d.value : null;
    },
    async set(key, value) {
      await store.updateDoc<ConfigDoc | null>(name(key), null, () => ({ value, updated_at: new Date().toISOString() }));
    },
    async setIfAbsent(key, value) {
      return (await store.createDoc<ConfigDoc>(name(key), { value, updated_at: new Date().toISOString() })).created;
    },
    async del(key) {
      await store.deleteDoc(name(key));
    },
  };
}

export function dataFor(store: Store): Data {
  return { store, config: configApi(store), ...collections(store) };
}

/** A bucket whose every call first waits for `ready()` (the one-time move from D1). */
export class GatedBucket implements R2Like {
  constructor(private readonly inner: R2Like, private readonly ready: () => Promise<void>) {}
  async get(key: string) { await this.ready(); return this.inner.get(key); }
  async head(key: string) { await this.ready(); return this.inner.head(key); }
  async put(key: string, value: string, options?: R2PutOpts) { await this.ready(); return this.inner.put(key, value, options); }
  async delete(keys: string | string[]) { await this.ready(); return this.inner.delete(keys); }
  async list(options?: R2ListOpts) { await this.ready(); return this.inner.list(options); }
}
