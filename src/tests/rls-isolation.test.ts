import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";

describe("PostgreSQL Row-Level Security (RLS) Tenant Isolation", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();

    // Create non-superuser role to accurately enforce Postgres RLS
    await db.exec(`
      CREATE ROLE examops_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    `);

    // Create representative tenant tables matching Prisma schema
    await db.exec(`
      CREATE TABLE "Candidate" (
        "id" TEXT PRIMARY KEY,
        "instituteId" TEXT NOT NULL,
        "seatNo" TEXT NOT NULL,
        "instCode" TEXT NOT NULL,
        "csm" TEXT NOT NULL
      );

      CREATE TABLE "Block" (
        "id" TEXT PRIMARY KEY,
        "instituteId" TEXT NOT NULL,
        "blockNo" INTEGER NOT NULL,
        "strength" INTEGER NOT NULL
      );

      GRANT SELECT, INSERT, UPDATE, DELETE ON "Candidate", "Block" TO examops_app;
    `);

    // Apply exact RLS policy structure from prisma/rls.sql
    await db.exec(`
      ALTER TABLE "Candidate" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "Candidate" FORCE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation_policy ON "Candidate"
        USING (
          current_setting('app.is_super_admin', true) = 'true'
          OR "instituteId" = current_setting('app.current_institute_id', true)
        )
        WITH CHECK (
          current_setting('app.is_super_admin', true) = 'true'
          OR "instituteId" = current_setting('app.current_institute_id', true)
        );

      ALTER TABLE "Block" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "Block" FORCE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation_policy ON "Block"
        USING (
          current_setting('app.is_super_admin', true) = 'true'
          OR "instituteId" = current_setting('app.current_institute_id', true)
        )
        WITH CHECK (
          current_setting('app.is_super_admin', true) = 'true'
          OR "instituteId" = current_setting('app.current_institute_id', true)
        );
    `);

    // Seed Tenant A and Tenant B data as table owner
    await db.exec(`
      INSERT INTO "Candidate" ("id", "instituteId", "seatNo", "instCode", "csm") VALUES
        ('c_a1', 'inst_a', '250447', '1227', 'CO-3-K'),
        ('c_a2', 'inst_a', '250448', '1227', 'CO-3-K'),
        ('c_b1', 'inst_b', '990001', '9999', 'ME-5-K');

      INSERT INTO "Block" ("id", "instituteId", "blockNo", "strength") VALUES
        ('b_a1', 'inst_a', 8, 36),
        ('b_b1', 'inst_b', 1, 36);
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  it("Tenant A can read only Tenant A's candidates and blocks", async () => {
    await db.exec(`BEGIN; SET LOCAL ROLE examops_app;`);
    await db.exec(`SELECT set_config('app.current_institute_id', 'inst_a', true);`);
    await db.exec(`SELECT set_config('app.is_super_admin', 'false', true);`);

    const candidates = await db.query<{ id: string; instituteId: string }>(
      `SELECT "id", "instituteId" FROM "Candidate"`
    );
    const blocks = await db.query<{ id: string; instituteId: string }>(
      `SELECT "id", "instituteId" FROM "Block"`
    );
    await db.exec(`COMMIT;`);

    expect(candidates.rows).toHaveLength(2);
    expect(candidates.rows.every((r) => r.instituteId === "inst_a")).toBe(true);
    expect(blocks.rows).toHaveLength(1);
    expect(blocks.rows[0].instituteId).toBe("inst_a");
  });

  it("Tenant B can never read Tenant A's candidates", async () => {
    await db.exec(`BEGIN; SET LOCAL ROLE examops_app;`);
    await db.exec(`SELECT set_config('app.current_institute_id', 'inst_b', true);`);
    await db.exec(`SELECT set_config('app.is_super_admin', 'false', true);`);

    const all = await db.query<{ id: string; instituteId: string }>(
      `SELECT "id", "instituteId" FROM "Candidate"`
    );
    const targeted = await db.query(
      `SELECT "id" FROM "Candidate" WHERE "instituteId" = 'inst_a'`
    );
    await db.exec(`COMMIT;`);

    expect(all.rows).toHaveLength(1);
    expect(all.rows[0].instituteId).toBe("inst_b");
    expect(targeted.rows).toHaveLength(0);
  });

  it("Tenant B cannot insert a row claiming to belong to Tenant A", async () => {
    await db.exec(`BEGIN; SET LOCAL ROLE examops_app;`);
    await db.exec(`SELECT set_config('app.current_institute_id', 'inst_b', true);`);
    await db.exec(`SELECT set_config('app.is_super_admin', 'false', true);`);

    await expect(
      db.exec(`
        INSERT INTO "Candidate" ("id", "instituteId", "seatNo", "instCode", "csm")
        VALUES ('c_spoof', 'inst_a', '250999', '1227', 'CO-3-K');
      `)
    ).rejects.toThrow(/row-level security/i);

    await db.exec(`ROLLBACK;`);
  });

  it("Unscoped session without instituteId sees zero rows", async () => {
    await db.exec(`BEGIN; SET LOCAL ROLE examops_app;`);
    await db.exec(`SELECT set_config('app.current_institute_id', '', true);`);
    await db.exec(`SELECT set_config('app.is_super_admin', 'false', true);`);

    const res = await db.query(`SELECT "id" FROM "Candidate"`);
    await db.exec(`COMMIT;`);

    expect(res.rows).toHaveLength(0);
  });

  it("Super Admin with app.is_super_admin='true' can inspect across tenants", async () => {
    await db.exec(`BEGIN; SET LOCAL ROLE examops_app;`);
    await db.exec(`SELECT set_config('app.current_institute_id', '', true);`);
    await db.exec(`SELECT set_config('app.is_super_admin', 'true', true);`);

    const res = await db.query(`SELECT "id" FROM "Candidate"`);
    await db.exec(`COMMIT;`);

    expect(res.rows).toHaveLength(3);
  });
});
