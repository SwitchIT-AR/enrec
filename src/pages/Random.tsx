import { useState, useEffect, useRef } from "react";
import styles from "./Random.module.css";

const SESSIONS = [
  { nombre: "La Valenti", videoId: "TjNZv7YNS8o" },
  { nombre: "PEMA", videoId: "3wlzbpi8Jqc" },
  { nombre: "Manu Martínez", videoId: "3u0bbataius" },
  { nombre: "Mariana Michi", videoId: "__KGJ4_HmgY" },
  { nombre: "Fepo", videoId: "zNRcYUV6ZdE" },
  { nombre: "Coval", videoId: "3CRVIZJU8F8" },
  { nombre: "Francisca y Los Exploradores", videoId: "4GrL1ccJ3mo" },
  { nombre: "Luaso", videoId: "yEq3rOBf0SM" },
  { nombre: "Martu Brito", videoId: "BZivQ-XM7tI" },
  { nombre: "Motel Montpellier", videoId: "nTQM4gD68Yo" },
  { nombre: "JJJulian", videoId: "jngaRABfN50" },
  { nombre: "Mina Baxx", videoId: "kLsmlObEMUk" },
  { nombre: "Los Palmos", videoId: "qXqajLd4YHI" },
];

const REFRESH_SECONDS = 12 * 60;

function pickRandom() {
  return SESSIONS[Math.floor(Math.random() * SESSIONS.length)];
}

export default function Random() {
  const [session] = useState(pickRandom);
  const [muted, setMuted] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-refresh after REFRESH_SECONDS
  useEffect(() => {
    const t = setTimeout(() => window.location.reload(), REFRESH_SECONDS * 1000);
    return () => clearTimeout(t);
  }, []);

  // Countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const countdown = `${minutes}:${String(seconds).padStart(2, "0")}`;

  const src = `https://www.youtube.com/embed/${session.videoId}?autoplay=1&mute=${muted ? 1 : 0}&rel=0&modestbranding=1`;

  function activateSound() {
    setMuted(false);
  }

  return (
    <div className={styles.container}>
      <iframe
        ref={iframeRef}
        key={muted ? "muted" : "unmuted"}
        className={styles.iframe}
        src={src}
        allow="autoplay; fullscreen"
        allowFullScreen
        title={session.nombre}
      />

      {muted && (
        <button className={styles.soundOverlay} onClick={activateSound}>
          <span className={styles.soundIcon}>🔊</span>
          <span className={styles.soundText}>Activar sonido</span>
        </button>
      )}

      <div className={styles.countdown}>
        Próximo video en {countdown}
      </div>
    </div>
  );
}
