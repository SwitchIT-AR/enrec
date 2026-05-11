import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Modal } from "@mantine/core";
import styles from "./Home.module.css";

import francisca from "../assets/francisca.jpg";
import francisca1 from "../assets/francisca1.jpg";
import jjulian from "../assets/jjjulian.jpg";
import logo from "../assets/logo-enrec.png";
import luaso from "../assets/luaso.jpg";
import luasogral from "../assets/luasogral.jpg";
import martu from "../assets/martu.jpg";
import mina from "../assets/mina.jpg";
import motel from "../assets/motel.jpg";
import palmitos from "../assets/palmitos.jpg";

// ── Reemplazar con los IDs reales de YouTube ───────────────────────────────
const FEATURED = [
  {
    ytId: "3u0bbataius",
    artist: "Manu Martínez",
    label: "Última sesión",
  },
  {
    ytId: "__KGJ4_HmgY",
    artist: "Mariana Michi",
    label: "Sesión #8",
  },
];

const sessions = [
  { src: francisca, url: "", label: "Francisca y Los Exploradores" },
  { src: motel, url: "https://www.youtube.com/embed/nTQM4gD68Yo", label: "Motel" },
  { src: martu, url: "https://www.youtube.com/embed/BZivQ-XM7tI", label: "Martu" },
  { src: luaso, url: "https://www.youtube.com/embed/yEq3rOBf0SM", label: "Luaso" },
  { src: luasogral, url: "", isCenter: true, label: "" },
  { src: francisca1, url: "", label: "Francisca y Los Exploradores #2" },
  { src: mina, url: "https://www.youtube.com/embed/kLsmlObEMUk", label: "Mina" },
  { src: jjulian, url: "https://www.youtube.com/embed/jngaRABfN50", label: "J. Julian" },
  { src: palmitos, url: "https://www.youtube.com/embed/qXqajLd4YHI", label: "Palmitos Park" },
];

const socials = [
  { label: "YouTube", href: "https://www.youtube.com/@En.REC-" },
  { label: "Instagram", href: "https://www.instagram.com/enrec.ar" },
  { label: "Spotify", href: "https://open.spotify.com/show/enrec" },
];

export default function Home() {
  const [opened, setOpened] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % FEATURED.length), 6000);
    return () => clearInterval(t);
  }, []);

  const openVideo = (embedUrl: string) => {
    setVideoUrl(embedUrl);
    setOpened(true);
  };

  const handleGridClick = (item: { url: string; isCenter?: boolean }) => {
    if (!item.url || item.isCenter) return;
    openVideo(item.url);
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        centered
        size="auto"
        withCloseButton
        overlayProps={{ backgroundOpacity: 0.92, blur: 8 }}
        styles={{
          content: { backgroundColor: "transparent", boxShadow: "none", padding: 0 },
        }}
      >
        <div className={styles.videoWrapper}>
          <iframe
            src={videoUrl}
            title="Sesión EN .REC"
            style={{ border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className={styles.videoFrame}
          />
        </div>
      </Modal>

      {/* ── Hero carousel ── */}
      <section className={styles.hero}>
        {/* Backgrounds que hacen crossfade */}
        {FEATURED.map((f, i) => (
          <div
            key={f.ytId}
            className={`${styles.carouselBg} ${i === activeIdx ? styles.carouselBgActive : ""}`}
          >
            <iframe
              src={`https://www.youtube.com/embed/${f.ytId}?autoplay=1&mute=1&loop=1&playlist=${f.ytId}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1`}
              title={f.artist}
              allow="autoplay; encrypted-media"
              allowFullScreen
              className={styles.carouselVideoFrame}
            />
          </div>
        ))}
        <div className={styles.carouselOverlay} />

        {/* Contenido encima */}
        <div className={styles.heroContent}>
          <img src={logo} alt="EN .REC" className={styles.heroLogo} />
          <p className={styles.heroTagline}>Lo que ves, lo que suena.</p>

          {/* Info de la sesión activa */}
          <div className={styles.sessionInfo}>
            <span className={styles.sessionLabel}>{FEATURED[activeIdx].label}</span>
            <span className={styles.sessionArtist}>{FEATURED[activeIdx].artist}</span>
          </div>

          {/* Play button */}
          <button
            className={styles.playBtn}
            onClick={() =>
              openVideo(`https://www.youtube.com/embed/${FEATURED[activeIdx].ytId}?autoplay=1`)
            }
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
            Ver sesión
          </button>

          {/* Dots */}
          <div className={styles.dots}>
            {FEATURED.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === activeIdx ? styles.dotActive : ""}`}
                onClick={() => setActiveIdx(i)}
                aria-label={`Sesión ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* CTAs abajo */}
        <div className={styles.heroCtas}>
          <Link to="/radar" className={styles.ctaPrimary}>
            Postulate para grabar
          </Link>
          <a href="#sesiones" className={styles.ctaSecondary}>
            Ver todas las sesiones
          </a>
        </div>
      </section>

      {/* ── Sesiones ── */}
      <section className={styles.sessions} id="sesiones">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Sesiones</h2>
          <p className={styles.sectionSub}>Hacé click en cada imagen para ver el video</p>
        </div>

        <div className={styles.grid}>
          {sessions.map((item, idx) => (
            <div
              key={idx}
              className={`${styles.cell} ${item.url && !item.isCenter ? styles.clickable : ""}`}
              onClick={() => handleGridClick(item)}
            >
              <img src={item.src} alt={item.label} className={styles.cellImg} />
              <div className={styles.cellOverlay} />
              {item.isCenter && (
                <img src={logo} alt="EN .REC" className={styles.centerLogo} />
              )}
              {item.url && !item.isCenter && (
                <div className={styles.playIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Sobre EN .REC ── */}
      <section className={styles.about}>
        <div className={styles.aboutInner}>
          <div className={styles.aboutText}>
            <span className={styles.aboutEyebrow}>Sobre EN .REC</span>
            <h2 className={styles.aboutTitle}>
              Un espacio, una canción,<br />una forma de mirar.
            </h2>
            <p className={styles.aboutBody}>
              EN .REC es un proyecto audiovisual dedicado a registrar música en vivo desde una mirada estética, sonora y curatorial. Cada sesión se desarrolla junto al artista, buscando una locación, una puesta visual y una forma de filmar que dialoguen con su identidad.
            </p>
            <p className={styles.aboutBody}>
              No es solo un canal de sesiones: es una plataforma cultural que combina música en vivo, curaduría, backstage, entrevistas y construcción de comunidad alrededor de la escena independiente latinoamericana.
            </p>
            <p className={styles.aboutProduced}>
              Producido por <strong>Onírica</strong>.
            </p>
          </div>
          <div className={styles.pillars}>
            {[
              {
                title: "Dirección artística",
                desc: "Cada sesión se construye desde el universo del artista. Sin fórmulas, sin escenarios genéricos.",
              },
              {
                title: "Alta calidad audiovisual",
                desc: "Dirección de foto, arte y sonido en vivo pensados al detalle para cada proyecto.",
              },
              {
                title: "Locaciones con identidad",
                desc: "Espacios que también cuentan algo, que dialogan con la música y el artista.",
              },
              {
                title: "Curaduría musical",
                desc: "Artistas de la escena independiente, pop indie y folk latinoamericano con identidad propia.",
              },
            ].map((p) => (
              <div key={p.title} className={styles.pillar}>
                <span className={styles.pillarDot} />
                <div>
                  <h3 className={styles.pillarTitle}>{p.title}</h3>
                  <p className={styles.pillarDesc}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Radar CTA ── */}
      <section className={styles.radarCta}>
        <div className={styles.radarCtaInner}>
          <span className={styles.radarDot} />
          <div>
            <h2 className={styles.radarCtaTitle}>¿Tenés un proyecto musical?</h2>
            <p className={styles.radarCtaText}>
              Estamos buscando artistas y bandas para grabar una nueva sesión en vivo.
              Las inscripciones están abiertas hasta el <strong>31 de Julio de 2026</strong>.
            </p>
          </div>
          <Link to="/radar" className={styles.radarCtaBtn}>
            Postulate ahora
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <img src={logo} alt="EN .REC" className={styles.footerLogo} />
        <nav className={styles.footerNav}>
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              {s.label}
            </a>
          ))}
        </nav>
        <p className={styles.footerCopy}>© {new Date().getFullYear()} EN .REC</p>
      </footer>
    </>
  );
}
