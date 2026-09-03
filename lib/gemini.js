import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-flash-lite-latest";
const FALLBACK_MODEL = "gemini-flash-latest";
const TTS_MODEL = "gemini-3.1-flash-tts-preview";
const TTS_VOICE = "Charon";
export const CONFIDENCE_THRESHOLD = 0.6;

// Sem isso, uma resposta lenta da API do Gemini (visto na prática: uma única chamada de
// tradução levou ~55s) trava a requisição inteira sem limite nenhum.
const REQUEST_TIMEOUT_MS = 15000;

// Lida uma vez, no carregamento do módulo — não a cada chamada. Na Vercel, process.env.GEMINI_API_KEY
// deixa de estar acessível dentro de um callback de after() (confirmado: o backfill de tradução em
// background falhava com "GEMINI_API_KEY não está definida" mesmo com a chave configurada certinho),
// então ler direto de process.env ali dentro nunca funcionava. Capturar num const no topo do módulo
// evita o problema, já que o módulo é avaliado durante a requisição original, antes do after() rodar.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let client;

function getClient() {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não está definida em .env.local");
  }

  if (!client) {
    client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  return client;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    identified: { type: "boolean" },
    pokemonName: { type: "string", nullable: true },
    confidence: { type: "number" },
    reasoning: { type: "string" },
  },
  required: ["identified", "pokemonName", "confidence", "reasoning"],
};

const SYSTEM_PROMPT = `Você identifica cartas físicas de Pokémon a partir de uma foto.
Responda apenas com o nome em inglês do Pokémon retratado na carta, exatamente como aparece na Pokédex oficial (ex: "pikachu", "mr. mime", "nidoran female").
Cartas full art, douradas ou com acabamento holográfico costumam ter o nome em fonte estilizada, com brilho ou baixo contraste — se o texto do nome estiver difícil de ler por esse motivo, use a ilustração/aparência do Pokémon na arte para identificá-lo mesmo assim.
Se mesmo assim não for possível identificar com razoável segurança, ou a carta não for de Pokémon, defina identified como false e confidence baixo — nunca "chute" um nome.`;

async function runIdentification(base64Image, mimeType, model) {
  const response = await getClient().models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: "Identifique o Pokémon nesta carta." },
          { inlineData: { mimeType, data: base64Image } },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    },
  });

  return JSON.parse(response.text);
}

export async function identifyPokemonFromImage(base64Image, mimeType) {
  let fastResult;
  try {
    fastResult = await runIdentification(base64Image, mimeType, MODEL);
  } catch (error) {
    console.error("Identificação rápida falhou (timeout ou erro de API):", error.message);
    fastResult = { identified: false, confidence: 0 };
  }

  if (fastResult.identified && fastResult.confidence >= CONFIDENCE_THRESHOLD) {
    return fastResult;
  }

  // O modelo rápido/barato falhou, ficou em dúvida ou estourou o timeout — provavelmente uma
  // carta full art, dourada ou com brilho de holográfico. Tenta de novo com um modelo mais forte
  // antes de desistir; esse custo extra de latência só é pago nas cartas difíceis.
  try {
    const strongResult = await runIdentification(base64Image, mimeType, FALLBACK_MODEL);
    return strongResult.confidence >= fastResult.confidence ? strongResult : fastResult;
  } catch (error) {
    console.error("Fallback de identificação com modelo mais forte falhou:", error.message);
    return fastResult;
  }
}

export async function translateToPortuguese(text) {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: text,
    config: {
      systemInstruction:
        "Traduza o texto a seguir do inglês para português do Brasil, mantendo o tom natural de uma descrição de Pokédex. Responda apenas com a tradução, sem aspas, comentários ou texto adicional.",
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    },
  });

  return response.text.trim();
}

const TTS_STYLE_PREFIX =
  "Leia o texto a seguir em português do Brasil com entonação monótona, mecânica e uniforme, " +
  "como a voz eletrônica de um dispositivo narrando uma enciclopédia. Não adicione comentários, leia apenas o texto: ";

export async function synthesizeSpeech(text) {
  const response = await getClient().models.generateContent({
    model: TTS_MODEL,
    contents: [{ role: "user", parts: [{ text: TTS_STYLE_PREFIX + text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } },
      },
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    },
  });

  const base64Pcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Pcm) {
    throw new Error("Gemini TTS não retornou áudio");
  }

  return Buffer.from(base64Pcm, "base64");
}
