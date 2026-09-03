import { NextResponse, after } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import mongoose from "mongoose";
import { translateToPortuguese } from "@/lib/gemini";

export const maxDuration = 30;

export async function GET() {
  await dbConnect();

  const hasKeyInMainRequest = Boolean(process.env.GEMINI_API_KEY);

  after(async () => {
    const log = {
      at: new Date(),
      hasKeyInMainRequest,
      hasKeyInAfter: Boolean(process.env.GEMINI_API_KEY),
    };
    try {
      const translated = await translateToPortuguese("This is a simple test sentence.");
      log.result = "success";
      log.translated = translated;
    } catch (error) {
      log.result = "error";
      log.errorName = error?.name ?? null;
      log.errorMessage = error?.message ?? String(error);
    }

    try {
      await mongoose.connection.db.collection("debug_after_test").insertOne(log);
    } catch {
      // se nem isso funcionar, não tem mais nada a fazer
    }
  });

  return NextResponse.json({ ok: true, triggeredAt: new Date().toISOString() });
}
