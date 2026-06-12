export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { signAdminSession, setAdminSessionCookie, verifyAdminPassword } from "@/lib/auth/admin";

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 },
    );
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 },
    );
  }

  const token = signAdminSession();
  const { name, value, options } = setAdminSessionCookie(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(name, value, options);
  return response;
}
