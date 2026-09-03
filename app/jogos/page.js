import MiniGamesHub from "@/components/MiniGamesHub";
import { getNationalDexCount, getPokemonByNameOrId } from "@/lib/pokeapi";

function randomId(dexCount) {
  return Math.floor(Math.random() * dexCount) + 1;
}

export default async function JogosPage() {
  const dexCount = await getNationalDexCount();
  const initialWhosThat = await getPokemonByNameOrId(randomId(dexCount));

  return <MiniGamesHub dexCount={dexCount} initialWhosThat={initialWhosThat} />;
}
