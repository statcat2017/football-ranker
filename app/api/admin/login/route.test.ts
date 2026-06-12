import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createAppDatabase, AppDatabase } from "@/lib/db/adapter";
import { SCHEMA } from "@/lib/db/schema";
import { resetDatabase } from "@/lib/db/client";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("POST /api/admin/login", () => {
  let db: AppDatabase;
  const dbPath = path.join(os.tmpdir(), `rank-login-test-${Date.now()}.sqlite`);

  beforeAll(async () => {
    db = createAppDatabase(dbPath);
    await db.exec(SCHEMA);
    process.env.SQLITE_DB_PATH = dbPath;
    process.env.ADMIN_PASSWORD = "test-password-123";
    process.env.ADMIN_SESSION_SECRET = "test-session-secret-for-hmac";
    resetDatabase();
  });

  afterAll(() => {
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_SESSION_SECRET;
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + "-wal"); } catch {}
    try { fs.unlinkSync(dbPath + "-shm"); } catch {}
  });

  it("returns 400 when password is missing", async () => {
    const { POST } = await import("@/app/api/admin/login/route");
    const req = new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Password is required");
  });

  it("returns 400 when password is empty string", async () => {
    const { POST } = await import("@/app/api/admin/login/route");
    const req = new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when password is wrong", async () => {
    const { POST } = await import("@/app/api/admin/login/route");
    const req = new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong-password" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Invalid password");
  });

  it("returns 200 and sets session cookie when password is correct", async () => {
    const { POST } = await import("@/app/api/admin/login/route");
    const req = new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "test-password-123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("fr_admin_session");
  });
});
