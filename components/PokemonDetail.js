"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PokemonDetail.module.css";
import TypeBadge from "./TypeBadge";
import StatRadar from "./StatRadar";
import FallbackImage from "./FallbackImage";
import { officialArtworkUrl, defaultSpriteUrl, animatedSpriteUrl } from "@/lib/sprites";
import { typeBackground, TYPE_COLORS } from "@/lib/pokemonTypes";
import { eggGroupLabel } from "@/lib/eggGroups";
import { speakPokemonEntry, stopSpeaking } from "@/lib/speech";

function GenderRate({ genderRate }) {
  if (genderRate === null || genderRate === undefined) return null;
  if (genderRate === -1) return <span>Sem gênero</span>;

  const female = Math.round((genderRate / 8) * 100);
  const male = 100 - female;
  return (
    <span>
      ♂ {male}% · ♀ {female}%
    </span>
  );
}

function WeaknessBadges({ label, types }) {
  if (!types || types.length === 0) return null;

  return (
    <div className={styles.weaknessGroup}>
      <p className={styles.weaknessLabel}>{label}</p>
      <div className={styles.weaknessBadges}>
        {types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </div>
    </div>
  );
}

export default function PokemonDetail({ pokemon, confidence, capturedBadge, autoSpeak }) {
  const [bouncing, setBouncing] = useState(false);
  const [speechState, setSpeechState] = useState("idle");
  const audioRef = useRef(null);

  useEffect(() => stopSpeaking, [pokemon.id]);

  const handleSpeakClick = async () => {
    if (speechState !== "idle") {
      stopSpeaking();
      setSpeechState("idle");
      return;
    }

    setSpeechState("loading");
    try {
      await speakPokemonEntry(pokemon, {
        onStart: () => setSpeechState("speaking"),
        onEnd: () => setSpeechState("idle"),
      });
    } catch (error) {
      console.error(error);
      setSpeechState("idle");
    }
  };

  useEffect(() => {
    if (!autoSpeak) return undefined;
    const timer = setTimeout(() => handleSpeakClick(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispara só uma vez ao montar com um pokémon recém-escaneado
  }, [autoSpeak, pokemon.id]);

  const handleSpriteClick = () => {
    setBouncing(false);
    requestAnimationFrame(() => setBouncing(true));

    if (pokemon.crySound) {
      if (!audioRef.current) {
        audioRef.current = new Audio(pokemon.crySound);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const primaryType = pokemon.types?.[0];
  const description = pokemon.flavorTextPt || pokemon.flavorText;
  const weaknesses = pokemon.weaknesses;

  return (
    <div className={styles.card} style={{ background: typeBackground(primaryType) }}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.spriteButton}
          onClick={handleSpriteClick}
          onAnimationEnd={() => setBouncing(false)}
          aria-label={`Tocar grito de ${pokemon.name}`}
        >
          <FallbackImage
            sources={[
              animatedSpriteUrl(pokemon.name),
              officialArtworkUrl(pokemon.id),
              defaultSpriteUrl(pokemon.id),
            ]}
            alt={pokemon.name}
            className={`${styles.sprite} ${bouncing ? styles.spriteBounce : ""}`}
          />
        </button>
        <div>
          <p className={styles.number}>#{pokemon.id}</p>
          <h2 className={styles.name}>{pokemon.name}</h2>
          {(pokemon.genusPt || pokemon.genus) && (
            <p className={styles.genus}>{pokemon.genusPt || pokemon.genus}</p>
          )}
          {typeof confidence === "number" && (
            <p className={styles.confidence}>{Math.round(confidence * 100)}% de confiança</p>
          )}
          {capturedBadge && <span className={styles.uncapturedTag}>Ainda não capturado</span>}
        </div>
      </div>

      <div className={styles.types}>
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </div>

      {description && (
        <>
          <p className={styles.flavorBox}>
            {description}
            {!pokemon.flavorTextPt && <span className={styles.flavorLang}>Descrição em inglês</span>}
          </p>
          <button type="button" className={styles.speakButton} onClick={handleSpeakClick}>
            {speechState === "loading" && "Gerando voz..."}
            {speechState === "speaking" && "Parar"}
            {speechState === "idle" && "Ouvir Pokédex"}
          </button>
        </>
      )}

      <div className={styles.metrics}>
        <span>Altura: {(pokemon.height / 10).toFixed(1)} m</span>
        <span>Peso: {(pokemon.weight / 10).toFixed(1)} kg</span>
        {typeof pokemon.captureRate === "number" && (
          <span>Captura: {pokemon.captureRate}/255</span>
        )}
        <GenderRate genderRate={pokemon.genderRate} />
      </div>

      {pokemon.eggGroups?.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Grupo de ovos</p>
          <p className={styles.metrics}>{pokemon.eggGroups.map(eggGroupLabel).join(", ")}</p>
        </div>
      )}

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Stats base</p>
        <StatRadar stats={pokemon.stats} color={TYPE_COLORS[primaryType] ?? "#ef4453"} />
      </div>

      {pokemon.abilitiesDetailed?.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Habilidades</p>
          {pokemon.abilitiesDetailed.map((ability) => (
            <div key={ability.name} className={styles.abilityItem}>
              <p className={styles.abilityName}>{ability.name.replace(/-/g, " ")}</p>
              {ability.effect && <p className={styles.abilityEffect}>{ability.effect}</p>}
            </div>
          ))}
        </div>
      )}

      {weaknesses && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Fraquezas e resistências</p>
          <WeaknessBadges label="Fraco (4x)" types={weaknesses.quadrupleWeak} />
          <WeaknessBadges label="Fraco (2x)" types={weaknesses.doubleWeak} />
          <WeaknessBadges label="Resiste (1/2x)" types={weaknesses.halfResist} />
          <WeaknessBadges label="Resiste (1/4x)" types={weaknesses.quarterResist} />
          <WeaknessBadges label="Imune" types={weaknesses.immune} />
        </div>
      )}

      {pokemon.evolutionChain?.length > 1 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Cadeia de evolução</p>
          <div className={styles.evolutionRow}>
            {pokemon.evolutionChain.map((stage, index) => (
              <div key={stage.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {index > 0 && <span className={styles.evolutionArrow}>→</span>}
                <div
                  className={`${styles.evolutionStage} ${
                    stage.id === pokemon.id ? styles.evolutionStageCurrent : ""
                  }`}
                >
                  <FallbackImage
                    sources={[defaultSpriteUrl(stage.id), officialArtworkUrl(stage.id)]}
                    alt={stage.name}
                    className={styles.evolutionSprite}
                  />
                  <span className={styles.evolutionName}>{stage.name}</span>
                  {stage.trigger && <span className={styles.evolutionTrigger}>{stage.trigger}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
