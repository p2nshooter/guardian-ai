/* Types for node:sqlite (Node 22+), used by tests/migrate.test.ts to rebuild the old D1 schema in memory. */
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): { all(...args: unknown[]): unknown[]; get(...args: unknown[]): unknown; run(...args: unknown[]): unknown };
  }
}
