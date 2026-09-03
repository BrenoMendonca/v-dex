import { after } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Pokemon from "@/models/Pokemon";
import ScanHistory from "@/models/ScanHistory";
import { translateToPortuguese } from "@/lib/gemini";
import { computeWeaknesses } from "@/lib/typeChart";

const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";

function normalizeQuery(query) {
  const trimmed = String(query).trim().toLowerCase();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
}

function formatPokemon(doc) {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const types = plain.types ?? [];

  return {
    id: plain.pokeApiId,
    name: plain.name,
    sprites: {
      frontDefault: plain.sprites?.frontDefault ?? null,
      animated: plain.sprites?.animated ?? null,
    },
    types,
    stats: (plain.stats ?? []).map((stat) => ({ name: stat.name, base: stat.base })),
    height: plain.height,
    weight: plain.weight,
    abilities: plain.abilities ?? [],
    abilitiesDetailed: plain.abilitiesDetailed ?? [],
    genus: plain.genus ?? null,
    genusPt: plain.genusPt ?? null,
    flavorText: plain.flavorText ?? null,
    flavorTextPt: plain.flavorTextPt ?? null,
    eggGroups: plain.eggGroups ?? [],
    captureRate: plain.captureRate ?? null,
    genderRate: plain.genderRate ?? null,
    crySound: plain.crySound ?? null,
    evolutionChain: plain.evolutionChain ?? [],
    weaknesses: computeWeaknesses(types),
  };
}

async function fetchFromPokeApi(query) {
  const response = await fetch(`${POKEAPI_BASE_URL}/pokemon/${query}`, {
    next: { revalidate: 86400 },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`PokeAPI respondeu ${response.status} para "${query}"`);
  }

  return response.json();
}

async function fetchSpeciesFromPokeApi(nameOrId) {
  try {
    const response = await fetch(`${POKEAPI_BASE_URL}/pokemon-species/${nameOrId}`, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

async function fetchAbilityDetail(name) {
  try {
    const response = await fetch(`${POKEAPI_BASE_URL}/ability/${name}`, {
      next: { revalidate: 604800 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const effect =
      pickEnglishText(data.effect_entries, "short_effect") ||
      pickEnglishText(data.effect_entries, "effect");

    return { name, effect };
  } catch {
    return null;
  }
}

function pickEnglishText(entries, field) {
  const entry = entries?.find((item) => item.language.name === "en");
  const raw = entry?.[field] ?? null;
  return raw ? raw.replace(/[\n\f\r]+/g, " ").trim() : null;
}

async function translateSafe(text, label) {
  if (!text) return null;
  try {
    return await translateToPortuguese(text);
  } catch (error) {
    console.error(`Falha ao traduzir ${label} para português:`, error.message);
    return null;
  }
}

function extractIdFromUrl(url) {
  const segments = url.split("/").filter(Boolean);
  return Number(segments[segments.length - 1]);
}

function describeEvolutionTrigger(detail) {
  if (!detail) return null;
  if (detail.min_level) return `Nv. ${detail.min_level}`;
  if (detail.item) return `Pedra: ${detail.item.name.replace(/-/g, " ")}`;
  if (detail.trigger?.name === "trade") return "Troca";
  if (detail.min_happiness) return "Felicidade alta";
  if (detail.trigger?.name === "level-up") return "Level up";
  return "Evolui";
}

function parseEvolutionChain(chainData) {
  const result = [];

  function walk(node, trigger) {
    if (!node) return;
    result.push({
      id: extractIdFromUrl(node.species.url),
      name: node.species.name,
      trigger,
    });
    for (const child of node.evolves_to ?? []) {
      walk(child, describeEvolutionTrigger(child.evolution_details?.[0]));
    }
  }

  walk(chainData?.chain, null);
  return result;
}

async function buildEnrichment(pokeApiId, prefetchedData) {
  const [data, species] = await Promise.all([
    prefetchedData ?? fetchFromPokeApi(pokeApiId),
    fetchSpeciesFromPokeApi(pokeApiId),
  ]);

  // Habilidades e cadeia de evolução só dependem de data/species (já resolvidos acima), não uma
  // da outra — buscar as duas em paralelo em vez de esperar as habilidades pra só então buscar
  // a evolução.
  const [abilitiesDetailed, evolutionChain] = await Promise.all([
    Promise.all(
      (data?.abilities ?? []).map(async (a) => {
        const detail = await fetchAbilityDetail(a.ability.name);
        return detail ?? { name: a.ability.name, effect: null };
      })
    ),
    (async () => {
      if (!species?.evolution_chain?.url) return [];
      try {
        const response = await fetch(species.evolution_chain.url, { next: { revalidate: 604800 } });
        if (!response.ok) return [];
        return parseEvolutionChain(await response.json());
      } catch (error) {
        console.error("Falha ao buscar cadeia de evolução:", error.message);
        return [];
      }
    })(),
  ]);

  const flavorText = pickEnglishText(species?.flavor_text_entries, "flavor_text");
  const genus = pickEnglishText(species?.genera, "genus");
  const [flavorTextPt, genusPt] = await Promise.all([
    translateSafe(flavorText, "descrição"),
    translateSafe(genus, "categoria"),
  ]);

  return {
    genus,
    genusPt,
    flavorText,
    flavorTextPt,
    abilitiesDetailed,
    eggGroups: species?.egg_groups?.map((g) => g.name) ?? [],
    captureRate: species?.capture_rate ?? null,
    genderRate: species?.gender_rate ?? null,
    evolutionChain,
    crySound: data?.cries?.latest ?? null,
    enrichedAt: new Date(),
  };
}

export async function getPokemonByNameOrId(query) {
  await dbConnect();

  const normalized = normalizeQuery(query);
  const filter = typeof normalized === "number" ? { pokeApiId: normalized } : { name: normalized };

  const cached = await Pokemon.findOne(filter);
  if (cached) {
    if (!cached.enrichedAt) {
      const enrichment = await buildEnrichment(cached.pokeApiId);
      Object.assign(cached, enrichment);
      await cached.save();
    } else if (
      (cached.flavorText && !cached.flavorTextPt) ||
      (cached.genus && !cached.genusPt)
    ) {
      // A tradução pode ter falhado numa tentativa anterior (chave ausente, modelo
      // sobrecarregado etc.) mesmo com o resto do enriquecimento já concluído. Isso afeta a
      // maioria dos Pokémon já cacheados (genusPt foi adicionado depois do enriquecimento
      // inicial da dex) — por isso o backfill roda em background (after), sem segurar a
      // resposta: o cliente recebe o texto em inglês agora e a tradução chega no próximo acesso.
      const doc = cached;
      const flavorText = doc.flavorText;
      const genus = doc.genus;
      const needsFlavor = Boolean(flavorText) && !doc.flavorTextPt;
      const needsGenus = Boolean(genus) && !doc.genusPt;

      after(async () => {
        try {
          let needsSave = false;
          if (needsFlavor) {
            doc.flavorTextPt = await translateSafe(flavorText, "descrição");
            needsSave = needsSave || Boolean(doc.flavorTextPt);
          }
          if (needsGenus) {
            doc.genusPt = await translateSafe(genus, "categoria");
            needsSave = needsSave || Boolean(doc.genusPt);
          }
          if (needsSave) {
            await doc.save();
          }
        } catch (error) {
          console.error("Falha no backfill de tradução em background:", error.message);
        }
      });
    }
    return formatPokemon(cached);
  }

  const data = await fetchFromPokeApi(normalized);
  if (!data) {
    return null;
  }

  const enrichment = await buildEnrichment(data.id, data);

  const doc = {
    name: data.name,
    pokeApiId: data.id,
    sprites: {
      frontDefault: data.sprites?.front_default ?? null,
      animated:
        data.sprites?.versions?.["generation-v"]?.["black-white"]?.animated?.front_default ?? null,
    },
    types: data.types?.map((t) => t.type.name) ?? [],
    stats: data.stats?.map((s) => ({ name: s.stat.name, base: s.base_stat })) ?? [],
    height: data.height,
    weight: data.weight,
    abilities: data.abilities?.map((a) => a.ability.name) ?? [],
    raw: data,
    fetchedAt: new Date(),
    ...enrichment,
  };

  const saved = await Pokemon.findOneAndUpdate(
    { name: doc.name },
    doc,
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  return formatPokemon(saved);
}

export async function getCapturedIds() {
  await dbConnect();

  const capturedNames = await ScanHistory.distinct("pokemonName", { status: "identified" });
  if (capturedNames.length === 0) {
    return [];
  }

  const pokemons = await Pokemon.find({ name: { $in: capturedNames } }, { pokeApiId: 1 });
  return pokemons.map((p) => p.pokeApiId);
}

export async function getPokemonIdsByType(type) {
  const response = await fetch(`${POKEAPI_BASE_URL}/type/${type}`, {
    next: { revalidate: 604800 },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.pokemon
    .map(({ pokemon }) => extractIdFromUrl(pokemon.url))
    .filter((id) => Number.isInteger(id));
}

export async function getNationalDexCount() {
  const response = await fetch(`${POKEAPI_BASE_URL}/pokemon-species?limit=1`, {
    next: { revalidate: 604800 },
  });

  if (!response.ok) {
    throw new Error(`PokeAPI respondeu ${response.status} ao buscar o total da Pokédex`);
  }

  const data = await response.json();
  return data.count;
}
