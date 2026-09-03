import { NextResponse, after } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import mongoose from "mongoose";

export const maxDuration = 30;

export async function GET() {
  await dbConnect();

  after(async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await mongoose.connection.db.collection("debug_after_test").insertOne({
        at: new Date(),
        note: "after() completou com sucesso",
      });
    } catch (error) {
      console.error("debug-after failed:", error.message);
    }
  });

  return NextResponse.json({ ok: true, triggeredAt: new Date().toISOString() });
}
