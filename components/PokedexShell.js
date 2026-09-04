"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./PokedexShell.module.css";
import { CameraIcon, PokeballIcon, UserIcon, GameControllerIcon, SunIcon, MoonIcon } from "./icons";
import { useTheme } from "@/lib/useTheme";
import { playPlink } from "@/lib/sfx";
import Onboarding from "./Onboarding";
import AuthForm from "./AuthForm";

const SCAN_TAB = { href: "/", label: "Escanear", Icon: CameraIcon, tour: "nav-scan" };

const KEY_TABS = [
  { href: "/capturados", label: "Pokédex", Icon: PokeballIcon, tour: "nav-dex" },
  { href: "/perfil", label: "Perfil", Icon: UserIcon, tour: "nav-profile" },
  { href: "/jogos", label: "Mini-jogos", Icon: GameControllerIcon, tour: "nav-games" },
];

export function emitTabReset(href) {
  window.dispatchEvent(new CustomEvent("pokedex:tab-reset", { detail: { href } }));
}

// Disparado pelo AuthForm só no fluxo de "Criar conta" — login numa conta existente nunca deve reabrir o onboarding.
export function emitJustRegistered(name) {
  window.dispatchEvent(new CustomEvent("pokedex:just-registered", { detail: { name } }));
}

export default function PokedexShell({ children }) {
  const pathname = usePathname();
  const { status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deviceKey, setDeviceKey] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState("");

  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    const handleJustRegistered = (event) => {
      setOnboardingName(event.detail?.name ?? "");
      setShowOnboarding(true);
    };
    window.addEventListener("pokedex:just-registered", handleJustRegistered);
    return () => window.removeEventListener("pokedex:just-registered", handleJustRegistered);
  }, []);

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
          <div className={styles.screenContent}>
            {isAuthenticated ? children : status === "loading" ? null : <AuthForm />}
          </div>
        </div>

        <div className={styles.controlStrip}>
          <span className={styles.dpad} aria-hidden="true" />
          <span className={styles.ledStrip} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <button
            type="button"
            className={styles.speaker}
            onClick={handleThemeToggle}
            aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
            suppressHydrationWarning
          >
            <SunIcon className={styles.iconSun} />
            <MoonIcon className={styles.iconMoon} />
          </button>
        </div>

        {isAuthenticated && (
        <nav className={styles.navBar}>
          <Link
            href={SCAN_TAB.href}
            data-tour={SCAN_TAB.tour}
            onClick={(event) => handleTabClick(event, SCAN_TAB.href, pathname === SCAN_TAB.href)}
            className={`${styles.navScan} ${pathname === SCAN_TAB.href ? styles.navScanActive : ""}`}
            aria-label={SCAN_TAB.label}
          >
            <SCAN_TAB.Icon />
          </Link>

          <div className={styles.navKeypad}>
            {KEY_TABS.map(({ href, label, Icon, tour }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  data-tour={tour}
                  onClick={(event) => handleTabClick(event, href, active)}
                  className={`${styles.keyButton} ${active ? styles.keyButtonActive : ""}`}
                  aria-label={label}
                >
                  <Icon />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        )}
      </div>

      {showOnboarding && (
        <Onboarding name={onboardingName} onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
