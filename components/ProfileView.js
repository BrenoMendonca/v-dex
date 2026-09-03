import styles from "./ProfileView.module.css";
import TypeBadge from "./TypeBadge";
import { UserIcon, PokeballIcon } from "./icons";
import { defaultSpriteUrl } from "@/lib/sprites";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default function ProfileView({ stats }) {
  const percent = Math.round((stats.capturedCount / stats.dexCount) * 100);
  const maxTypeCount = stats.topTypes[0]?.count ?? 1;

  return (
    <div className={styles.page}>
      <PokeballIcon className={styles.pageBall} aria-hidden="true" />

      <div className={styles.content}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          <UserIcon />
        </div>
        <div>
          <p className={styles.title}>Treinador(a)</p>
          <p className={styles.subtitle}>Perfil da sua Pokédex</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.progressHeader}>
          <span>Progresso da Pokédex</span>
          <span className={styles.progressValue}>
            {stats.capturedCount} / {stats.dexCount} ({percent}%)
          </span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statTile}>
          <p className={styles.statValue}>{stats.totalScans}</p>
          <p className={styles.statLabel}>Scans</p>
        </div>
        <div className={styles.statTile}>
          <p className={styles.statValue}>{stats.identifiedScans}</p>
          <p className={styles.statLabel}>Identificados</p>
        </div>
        <div className={styles.statTile}>
          <p className={styles.statValue}>{stats.notIdentifiedScans}</p>
          <p className={styles.statLabel}>Não identificados</p>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.sectionTitle}>Tipos mais capturados</p>
        {stats.topTypes.length === 0 && <p className={styles.empty}>Nenhum Pokémon capturado ainda.</p>}
        {stats.topTypes.map(({ type, count }) => (
          <div key={type} className={styles.typeRow}>
            <TypeBadge type={type} />
            <div className={styles.progressTrack} style={{ flex: 1 }}>
              <div
                className={styles.progressFill}
                style={{ width: `${(count / maxTypeCount) * 100}%` }}
              />
            </div>
            <span className={styles.typeCount}>{count}</span>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <p className={styles.sectionTitle}>Capturas recentes</p>
        {stats.recentCaptures.length === 0 && (
          <p className={styles.empty}>Escaneie uma carta para começar seu histórico.</p>
        )}
        <div className={styles.recentList}>
          {stats.recentCaptures.map((capture) => (
            <div key={`${capture.name}-${capture.capturedAt}`} className={styles.recentItem}>
              {capture.id && (
                // eslint-disable-next-line @next/next/no-img-element -- sprite pixel art da PokeAPI
                <img src={defaultSpriteUrl(capture.id)} alt="" className={styles.recentSprite} />
              )}
              <div>
                <p className={styles.recentName}>{capture.name}</p>
                <p className={styles.recentDate}>{dateFormatter.format(new Date(capture.capturedAt))}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
