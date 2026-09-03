"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./PokedexShell.module.css";
import { CameraIcon, PokeballIcon, UserIcon, GameControllerIcon, SunIcon, MoonIcon } from "./icons";
import { useTheme } from "@/lib/useTheme";
import { playPlink } from "@/lib/sfx";

const SCAN_TAB = { href: "/", label: "Escanear", Icon: CameraIcon };

const KEY_TABS = [
  { href: "/capturados", label: "Pokédex", Icon: PokeballIcon },
  { href: "/perfil", label: "Perfil", Icon: UserIcon },
  { href: "/jogos", label: "Mini-jogos", Icon: GameControllerIcon },
];

export function emitTabReset(href) {
  window.dispatchEvent(new CustomEvent("pokedex:tab-reset", { detail: { href } }));
}

export default function PokedexShell({ children }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deviceKey, setDeviceKey] = useState(0);

  const handleTabClick = (event, href, active) => {
    playPlink();
    if (active) {
      event.preventDefault();
      emitTabReset(href);
    }
  };

  const handleOpenClick = () => {
    playPlink();
    setDeviceKey((key) => key + 1);
    setIsOpen(true);
  };

  const handleLensClick = () => {
    playPlink();
    if (!closing) {
      setClosing(true);
    }
  };

  const handleThemeToggle = () => {
    playPlink();
    toggleTheme();
  };

  const handleDeviceAnimationEnd = () => {
    if (closing) {
      setClosing(false);
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <div className={styles.appContainer}>
        <button
          type="button"
          className={styles.closedCover}
          onClick={handleOpenClick}
          aria-label="Abrir a Pokédex"
        >
          <PokeballIcon className={styles.closedBall} />
          <span className={styles.closedHint}>Toque para abrir</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      <div
        key={deviceKey}
        className={`${styles.device} ${closing ? styles.deviceClosing : ""}`}
        onAnimationEnd={handleDeviceAnimationEnd}
      >
        <div className={styles.headerWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático local, não precisa de otimização do next/image */}
          <img src="/Images/header.svg" alt="" className={styles.headerImage} aria-hidden="true" />
          <button
            type="button"
            className={styles.lensHit}
            onClick={handleLensClick}
            aria-label="Fechar a Pokédex"
          />
        </div>

        <div className={styles.screen}>
          <div className={styles.screenContent}>{children}</div>
        </div>

        <div className={styles.controlStrip}>
          <span className={styles.dpad} aria-hidden="true" />
          <span className={styles.ledStrip} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className={styles.speaker} aria-hidden="true" />
        </div>

        <nav className={styles.navBar}>
          <Link
            href={SCAN_TAB.href}
            onClick={(event) => handleTabClick(event, SCAN_TAB.href, pathname === SCAN_TAB.href)}
            className={`${styles.navScan} ${pathname === SCAN_TAB.href ? styles.navScanActive : ""}`}
            aria-label={SCAN_TAB.label}
          >
            <SCAN_TAB.Icon />
          </Link>

          <div className={styles.navKeypad}>
            {KEY_TABS.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={(event) => handleTabClick(event, href, active)}
                  className={`${styles.keyButton} ${active ? styles.keyButtonActive : ""}`}
                  aria-label={label}
                >
                  <Icon />
                  <span>{label}</span>
                </Link>
              );
            })}

            <button
              type="button"
              className={styles.keyButton}
              onClick={handleThemeToggle}
              aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
              suppressHydrationWarning
            >
              <SunIcon className={styles.iconSun} />
              <MoonIcon className={styles.iconMoon} />
              <span>Tema</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
