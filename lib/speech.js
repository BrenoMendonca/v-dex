import { playLevelUpChime } from "@/lib/sfx";

let currentAudio = null;
let currentUrl = null;

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Formas alternativas (Mega Evolução, Gigantamax, regionais) têm nomes com hífen na PokeAPI
// (ex: "charizard-mega-x") — fica estranho falado com hífen, então troca por espaço antes.
function formatPokemonName(name) {
  return name.replace(/-/g, " ").split(" ").map(capitalize).join(" ");
}

function findPreEvolution(pokemon) {
  const chain = pokemon.evolutionChain;
  if (!chain || chain.length < 2) return null;
  const index = chain.findIndex((stage) => stage.id === pokemon.id);
  if (index <= 0) return null;
  return chain[index - 1];
}

function buildEntryText(pokemon) {
  const description = pokemon.flavorTextPt || pokemon.flavorText || "";
  const genus = pokemon.genusPt || pokemon.genus;
  const preEvolution = findPreEvolution(pokemon);
  const preEvolutionText = preEvolution ? `Evolui de ${formatPokemonName(preEvolution.name)}. ` : "";
  return `${preEvolutionText}${formatPokemonName(pokemon.name)}. ${genus ? genus + ". " : ""}${description}`;
}

async function playText(text, { onStart, onEnd, chime = false } = {}) {
  stopSpeaking();

  const response = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error("Falha ao gerar áudio da Pokédex");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  currentAudio = audio;
  currentUrl = url;

  audio.onended = () => {
    URL.revokeObjectURL(url);
    onEnd?.();
  };
  audio.onerror = () => {
    URL.revokeObjectURL(url);
    onEnd?.();
  };

  if (chime) {
    await playLevelUpChime();
  }
  onStart?.();
  await audio.play();
}

export async function speakPokemonEntry(pokemon, options = {}) {
  return playText(buildEntryText(pokemon), { ...options, chime: true });
}

// Fala um texto qualquer (ex: narração do onboarding), sem o efeito de "Level Up" que é específico da revelação de Pokémon.
export async function speakText(text, options = {}) {
  return playText(text, { ...options, chime: false });
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}
