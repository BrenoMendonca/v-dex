"use client";

import { useEffect } from "react";
import styles from "./CaptureReveal.module.css";
import FallbackImage from "./FallbackImage";
import { animatedSpriteUrl, officialArtworkUrl, defaultSpriteUrl } from "@/lib/sprites";
import { playCaught } from "@/lib/sfx";

const REVEAL_DURATION_MS = 1200;
const CRY_DELAY_MS = 550;

export default function CaptureReveal({ pokemon, onDone }) {
  useEffect(() => {
    playCaught();

    const cryTimer = pokemon.crySound
      ? setTimeout(() => {
          const audio = new Audio(pokemon.crySound);
          audio.play().catch(() => {});
        }, CRY_DELAY_MS)
      : null;

    const doneTimer = setTimeout(() => onDone?.(), REVEAL_DURATION_MS);

    return () => {
      if (cryTimer) clearTimeout(cryTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone, pokemon.crySound]);

  return (
    <div className={styles.overlay}>
      <span className={styles.glow} aria-hidden="true" />
      <div className={styles.spriteWrap}>
        <FallbackImage
          sources={[
            animatedSpriteUrl(pokemon.name),
            officialArtworkUrl(pokemon.id),
            defaultSpriteUrl(pokemon.id),
          ]}
          alt={pokemon.name}
          className={styles.sprite}
        />
      </div>
      <p className={styles.caughtText}>Pokémon identificado!</p>
      <p className={styles.name}>{pokemon.name}</p>
    </div>
  );
}
