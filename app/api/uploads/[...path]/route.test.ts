import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("GET /api/uploads/[...path]", () => {
  const uploadDir = path.join(os.tmpdir(), `rank-uploads-test-${Date.now()}`);

  beforeAll(() => {
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, "test.jpg"), "fake jpeg data");
    process.env.UPLOAD_DIR = uploadDir;
  });

  afterAll(() => {
    delete process.env.UPLOAD_DIR;
    try { fs.rmSync(uploadDir, { recursive: true }); } catch {}
  });

  it("serves a valid file", async () => {
    const { GET } = await import("@/app/api/uploads/[...path]/route");
    const req = new Request("http://localhost/api/uploads/player-photos/test.jpg");
    const res = await GET(req, { params: Promise.resolve({ path: ["player-photos", "test.jpg"] }) });
    expect(res.status).toBe(200);
    const contentType = res.headers.get("content-type");
    expect(contentType).toBe("image/jpeg");
  });

  it("returns 404 for nonexistent file", async () => {
    const { GET } = await import("@/app/api/uploads/[...path]/route");
    const req = new Request("http://localhost/api/uploads/player-photos/nope.jpg");
    const res = await GET(req, { params: Promise.resolve({ path: ["player-photos", "nope.jpg"] }) });
    expect(res.status).toBe(404);
  });

  it("blocks path traversal with ..", async () => {
    const { GET } = await import("@/app/api/uploads/[...path]/route");
    const req = new Request("http://localhost/api/uploads/player-photos/../../etc/passwd");
    const res = await GET(req, { params: Promise.resolve({ path: ["player-photos", "..", "..", "etc", "passwd"] }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid path");
  });

  it("blocks path traversal with null byte", async () => {
    const { GET } = await import("@/app/api/uploads/[...path]/route");
    const req = new Request("http://localhost/api/uploads/player-photos/test%00.jpg");
    const res = await GET(req, { params: Promise.resolve({ path: ["player-photos", "test\u0000.jpg"] }) });
    expect(res.status).toBe(400);
  });
});
