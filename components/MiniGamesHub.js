"use client";

import { useEffect, useState } from "react";
import styles from "./MiniGamesHub.module.css";
import WhosThatPokemon from "./WhosThatPokemon";
import { playPlink } from "@/lib/sfx";

const GAMES = [
  {
    id: "quem-e-esse",
    title: "Quem é esse Pokémon?",
    description: "Monte o nome do Pokémon clicando nas letras certas.",
  },
];

export default function MiniGamesHub({ dexCount, initialWhosThat }) {
  const [activeGame, setActiveGame] = useState(null);

  useEffect(() => {
    const handleReset = (event) => {
      if (event.detail?.href !== "/jogos") return;
      setActiveGame(null);
    };

    window.addEventListener("pokedex:tab-reset", handleReset);
    return () => window.removeEventListener("pokedex:tab-reset", handleReset);
  }, []);

  const handleSelect = (id) => {
    playPlink();
    setActiveGame(id);
  };

  const handleBack = () => {
    playPlink();
    setActiveGame(null);
  };

  if (activeGame) {
    return (
      <div className={styles.gameWrap}>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          &lt; Mini-jogos
        </button>

        {activeGame === "quem-e-esse" && (
          <WhosThatPokemon dexCount={dexCount} initialPokemon={initialWhosThat} />
        )}
      </div>
    );
  }

  return (
    <div className={styles.menu}>
      <p className={styles.menuTitle}>Mini-jogos</p>
      {GAMES.map((game) => (
        <button
          key={game.id}
          type="button"
          className={styles.gameCard}
          onClick={() => handleSelect(game.id)}
        >
          <p className={styles.gameCardTitle}>{game.title}</p>
          <p className={styles.gameCardDescription}>{game.description}</p>
        </button>
      ))}
    </div>
  );
}
