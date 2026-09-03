import { playLevelUpChime } from "@/lib/sfx";

let currentAudio = null;
let currentUrl = null;

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  const preEvolutionText = preEvolution ? `Evolui de ${capitalize(preEvolution.name)}. ` : "";
  return `${preEvolutionText}${capitalize(pokemon.name)}. ${genus ? genus + ". " : ""}${description}`;
}

export async function speakPokemonEntry(pokemon, { onStart, onEnd } = {}) {
  stopSpeaking();

  const response = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: buildEntryText(pokemon) }),
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

  await playLevelUpChime();
  onStart?.();
  await audio.play();
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
