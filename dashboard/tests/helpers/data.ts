/* A complete, in-memory axto.io data store for unit tests: the real
 * collections (lib/data/schema.ts) on the exact R2 fake (lib/r2/fake.ts). */
import { FakeR2, fakeClock } from "../../lib/r2/fake";
import { Store } from "../../lib/r2/store";
import { dataFor, type Data } from "../../lib/data";

export function testData(): { db: Data; bucket: FakeR2 } {
  const clock = fakeClock();
  const bucket = new FakeR2({ now: clock.now });
  return { db: dataFor(new Store(bucket, { sleep: clock.sleep, now: clock.now })), bucket };
}
