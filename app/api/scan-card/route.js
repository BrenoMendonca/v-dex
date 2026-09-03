import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import ScanHistory from "@/models/ScanHistory";
import { identifyPokemonFromImage, CONFIDENCE_THRESHOLD } from "@/lib/gemini";
import { getPokemonByNameOrId } from "@/lib/pokeapi";
import { normalizePokemonName } from "@/lib/normalize";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_PER_IP = 15;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function parseDataUrl(imageBase64) {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(imageBase64);
  if (!match) {
    return null;
  }
  return { mimeType: match[1], data: match[2] };
}

async function isRateLimited(ip) {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const count = await ScanHistory.countDocuments({ ip, createdAt: { $gte: windowStart } });
  return count >= RATE_LIMIT_MAX_PER_IP;
}

export async function POST(request) {
  await dbConnect();

  const ip = getClientIp(request);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", error: "invalid_json" }, { status: 400 });
  }

  const { imageBase64 } = body ?? {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json({ status: "error", error: "missing_image" }, { status: 400 });
  }

  const parsed = parseDataUrl(imageBase64);
  if (!parsed || !ALLOWED_MIME_TYPES.includes(parsed.mimeType)) {
    return NextResponse.json({ status: "error", error: "invalid_image_format" }, { status: 400 });
  }

  const approxBytes = (parsed.data.length * 3) / 4;
  if (approxBytes > MAX_IMAGE_BYTES) {
    return NextResponse.json({ status: "error", error: "image_too_large" }, { status: 400 });
  }

  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { status: "rate_limited", retryAfterMs: RATE_LIMIT_WINDOW_MS },
      { status: 429 }
    );
  }

  const imageHash = createHash("sha256").update(parsed.data).digest("hex");

  try {
    const cachedScan = await ScanHistory.findOne({ imageHash, status: "identified" }).sort({
      createdAt: -1,
    });

    let identification;
    if (cachedScan) {
      identification = {
        identified: true,
        pokemonName: cachedScan.pokemonName,
        confidence: cachedScan.confidence,
      };
    } else {
      identification = await identifyPokemonFromImage(parsed.data, parsed.mimeType);
    }

    if (!identification.identified || identification.confidence < CONFIDENCE_THRESHOLD) {
      await ScanHistory.create({
        ip,
        imageHash,
        status: "not_identified",
        confidence: identification.confidence ?? null,
      });
      return NextResponse.json({ status: "not_identified" });
    }

    const normalizedName = normalizePokemonName(identification.pokemonName);
    const pokemon = await getPokemonByNameOrId(normalizedName);

    if (!pokemon) {
      await ScanHistory.create({
        ip,
        imageHash,
        status: "not_identified",
        confidence: identification.confidence,
        errorMessage: `PokeAPI não reconheceu "${normalizedName}"`,
      });
      return NextResponse.json({ status: "not_identified" });
    }

    await ScanHistory.create({
      ip,
      imageHash,
      status: "identified",
      pokemonName: normalizedName,
      confidence: identification.confidence,
    });

    return NextResponse.json({ status: "identified", confidence: identification.confidence, pokemon });
  } catch (error) {
    console.error("POST /api/scan-card failed:", error);
    await ScanHistory.create({
      ip,
      imageHash,
      status: "error",
      errorMessage: error.message,
    }).catch(() => {});
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
