"use client";

import { useState } from "react";
import styles from "./WhosThatPokemon.module.css";
import FallbackImage from "./FallbackImage";
import { animatedSpriteUrl, officialArtworkUrl, defaultSpriteUrl } from "@/lib/sprites";
import { playCaught, playPlink } from "@/lib/sfx";

function pickRandomId(dexCount) {
  return Math.floor(Math.random() * dexCount) + 1;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildTiles(name) {
  return shuffle(
    name
      .replace(/-/g, " ")
      .split("")
      .map((char, index) => ({ id: index, char }))
      .filter((tile) => tile.char !== " ")
  );
}

export default function WhosThatPokemon({ dexCount, initialPokemon }) {
  const [pokemon, setPokemon] = useState(initialPokemon);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("playing");
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [tiles, setTiles] = useState(() => (initialPokemon ? buildTiles(initialPokemon.name) : []));
  const [slots, setSlots] = useState(() =>
    initialPokemon ? initialPokemon.name.replace(/-/g, " ").split("").map((char) => (char === " " ? "gap" : null)) : []
  );
  const [lockedSlots, setLockedSlots] = useState(new Set());

  const displayChars = pokemon ? pokemon.name.replace(/-/g, " ").split("") : [];
  const placedTileIds = new Set(slots.filter((v) => v !== null && v !== "gap"));
  const allFilled = slots.every((v) => v !== null);

  const resetRound = (nextPokemon) => {
    setStatus("playing");
    setTiles(buildTiles(nextPokemon.name));
    setSlots(nextPokemon.name.replace(/-/g, " ").split("").map((char) => (char === " " ? "gap" : null)));
    setLockedSlots(new Set());
  };

  const loadNext = async () => {
    setLoading(true);
    try {
      const id = pickRandomId(dexCount);
      const response = await fetch(`/api/pokemon/${id}`);
      const data = await response.json();
      setPokemon(data);
      resetRound(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTileClick = (tileId) => {
    if (status !== "playing" || placedTileIds.has(tileId)) return;
    const nextIndex = slots.findIndex((v) => v === null);
    if (nextIndex === -1) return;
    playPlink();
    const nextSlots = [...slots];
    nextSlots[nextIndex] = tileId;
    setSlots(nextSlots);
  };

  const handleSlotClick = (index) => {
    if (status !== "playing" || lockedSlots.has(index) || slots[index] === null || slots[index] === "gap")
      return;
    playPlink();
    const nextSlots = [...slots];
    nextSlots[index] = null;
    setSlots(nextSlots);
  };

  const handleCheck = () => {
    if (status !== "playing" || !allFilled) return;

    const guessedName = slots
      .map((tileId, i) => (tileId === "gap" ? "-" : tiles.find((t) => t.id === tileId)?.char ?? ""))
      .join("");

    if (guessedName === pokemon.name) {
      setStatus("correct");
      setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
      playCaught();
      if (pokemon.crySound) {
        new Audio(pokemon.crySound).play().catch(() => {});
      }
      return;
    }

    playPlink();
    const nextLocked = new Set(lockedSlots);
    const nextSlots = [...slots];
    slots.forEach((tileId, i) => {
      if (tileId === "gap" || tileId === null) return;
      const char = tiles.find((t) => t.id === tileId)?.char;
      if (char === displayChars[i]) {
        nextLocked.add(i);
      } else {
        nextSlots[i] = null;
      }
    });
    setLockedSlots(nextLocked);
    setSlots(nextSlots);
  };

  const handleGiveUp = () => {
    if (status !== "playing") return;
    setStatus("gaveup");
    setScore((s) => ({ ...s, total: s.total + 1 }));
  };

  const availableTiles = tiles.filter((tile) => !placedTileIds.has(tile.id));

  return (
    <div className={styles.wrap}>
      <div className={styles.scoreRow}>
        <span>
          Acertos: {score.correct}/{score.total}
        </span>
      </div>

      <div className={styles.silhouetteBox}>
        {pokemon && (
          <FallbackImage
            sources={[
              animatedSpriteUrl(pokemon.name),
              officialArtworkUrl(pokemon.id),
              defaultSpriteUrl(pokemon.id),
            ]}
            alt={pokemon.name}
            className={styles.silhouette}
          />
        )}
      </div>

      <div className={styles.blanks}>
        {slots.map((tileId, i) =>
          tileId === "gap" ? (
            <span key={i} className={styles.blankGap} />
          ) : (
            <button
              key={i}
              type="button"
              className={`${styles.blankLetter} ${lockedSlots.has(i) ? styles.blankLetterLocked : ""}`}
              onClick={() => handleSlotClick(i)}
              disabled={status !== "playing" || lockedSlots.has(i) || tileId === null}
            >
              {status !== "playing"
                ? displayChars[i].toUpperCase()
                : tileId !== null
                  ? tiles.find((t) => t.id === tileId)?.char.toUpperCase()
                  : ""}
            </button>
          )
        )}
      </div>

      {status === "correct" && (
        <p className={styles.feedbackCorrect}>Isso mesmo! É {pokemon.name}!</p>
      )}
      {status === "gaveup" && (
        <p className={styles.feedbackWrong}>Era {pokemon.name}. Próxima!</p>
      )}

      {status === "playing" ? (
        <>
          <div className={styles.bank}>
            {availableTiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                className={styles.tile}
                onClick={() => handleTileClick(tile.id)}
                disabled={loading}
              >
                {tile.char.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.submitButton}
            onClick={handleCheck}
            disabled={loading || !allFilled}
          >
            Chutar
          </button>
          <button type="button" className={styles.giveUpButton} onClick={handleGiveUp}>
            Desistir / Revelar
          </button>
        </>
      ) : (
        <button type="button" className={styles.nextButton} onClick={loadNext} disabled={loading}>
          {loading ? "Carregando..." : "Próximo Pokémon"}
        </button>
      )}
    </div>
  );
}
