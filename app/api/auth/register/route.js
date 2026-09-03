import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

const LOGIN_REGEX = /^[a-z0-9_.-]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export async function POST(request) {
  await dbConnect();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const login = String(body?.login ?? "").trim().toLowerCase();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!LOGIN_REGEX.test(login)) {
    return NextResponse.json({ error: "invalid_login" }, { status: 400 });
  }
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const existing = await User.findOne({ $or: [{ login }, { email }] });
  if (existing) {
    return NextResponse.json({ error: "already_exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ login, email, passwordHash });

  return NextResponse.json({ ok: true });
}
