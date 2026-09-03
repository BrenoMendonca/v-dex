"use client";

import { useState } from "react";
import styles from "./WhosThatPokemon.module.css";
import FallbackImage from "./FallbackImage";
import { animatedSpriteUrl, officialArtworkUrl, defaultSpriteUrl } from "@/lib/sprites";
import { normalizePokemonName } from "@/lib/normalize";
import { playCaught, playPlink } from "@/lib/sfx";

function pickRandomId(dexCount) {
  return Math.floor(Math.random() * dexCount) + 1;
}

export default function WhosThatPokemon({ dexCount, initialPokemon }) {
  const [pokemon, setPokemon] = useState(initialPokemon);
  const [loading, setLoading] = useState(false);
  const [guess, setGuess] = useState("");
  const [revealedIndexes, setRevealedIndexes] = useState(new Set());
  const [status, setStatus] = useState("playing");
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const displayChars = pokemon ? pokemon.name.replace(/-/g, " ").split("") : [];
  const revealed = status !== "playing";

  const loadNext = async () => {
    setLoading(true);
    setStatus("playing");
    setGuess("");
    setRevealedIndexes(new Set());

    try {
      const id = pickRandomId(dexCount);
      const response = await fetch(`/api/pokemon/${id}`);
      const data = await response.json();
      setPokemon(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!guess.trim() || status !== "playing" || !pokemon) return;

    if (normalizePokemonName(guess) === pokemon.name) {
      setStatus("correct");
      setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
      playCaught();
      if (pokemon.crySound) {
        new Audio(pokemon.crySound).play().catch(() => {});
      }
    } else {
      playPlink();

      const nextRevealed = new Set(revealedIndexes);
      for (let i = 0; i < displayChars.length; i++) {
        if (displayChars[i] !== " " && !nextRevealed.has(i)) {
          nextRevealed.add(i);
          break;
        }
      }
      setRevealedIndexes(nextRevealed);

      const anyHidden = displayChars.some((char, i) => char !== " " && !nextRevealed.has(i));
      if (!anyHidden) {
        setStatus("gaveup");
        setScore((s) => ({ ...s, total: s.total + 1 }));
      }
    }

    setGuess("");
  };

  const handleGiveUp = () => {
    if (status !== "playing") return;
    setStatus("gaveup");
    setScore((s) => ({ ...s, total: s.total + 1 }));
  };

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
            alt={revealed ? pokemon.name : "Pokémon misterioso"}
            className={`${styles.silhouette} ${revealed ? styles.silhouetteRevealed : ""}`}
          />
        )}
      </div>

      <div className={styles.blanks}>
        {displayChars.map((char, i) =>
          char === " " ? (
            <span key={i} className={styles.blankGap} />
          ) : (
            <span key={i} className={styles.blankLetter}>
              {revealed || revealedIndexes.has(i) ? char.toUpperCase() : ""}
            </span>
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
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              type="text"
              className={styles.input}
              placeholder="Nome do Pokémon"
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              disabled={loading}
              autoComplete="off"
            />
            <button type="submit" className={styles.submitButton} disabled={loading}>
              Chutar
            </button>
          </form>
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
