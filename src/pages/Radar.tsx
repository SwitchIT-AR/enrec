import { useState, useEffect } from "react";
import type { FormEvent, ChangeEvent } from "react";
import styles from "./Radar.module.css";
import { gtmPush, gtagConversion } from "../gtm";

const API_URL = "/api/radar";

type ActiveSet = {
  id: number;
  nombre: string;
  p1_etiqueta: string;
  p1_pregunta: string;
  p1_youtube_url: string;
  p2_etiqueta: string;
  p2_pregunta: string;
  p2_youtube_url: string;
};

const DEFAULTS = {
  p1_etiqueta: "Sesión #7 — Francisca y Los Exploradores",
  p1_pregunta: "En la sesión de Francisca y Los Exploradores, por momentos se puede ver a los camarógrafos filmando... ¿cuántas veces aparecen en cámara?",
  p1_youtube_url: "https://www.youtube.com/embed/4GrL1ccJ3mo",
  p2_etiqueta: "Sesión #8 — Mariana Michi",
  p2_pregunta: "¿Cuántos riffs y/o solos toca el guitarrista a lo largo de la sesión? Momentos instrumentales donde Mariana no canta.",
  p2_youtube_url: "https://www.youtube.com/embed/__KGJ4_HmgY",
};

function toEmbedUrl(url: string): string {
  if (!url) return "";
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

const TYC_TEXT = `TÉRMINOS Y CONDICIONES — CONVOCATORIA "RADAR EN .REC"

1. PARTICIPACIÓN
Pueden participar artistas solistas y bandas de cualquier género musical con residencia en Argentina. La inscripción es gratuita y no genera ningún tipo de obligación contractual entre el postulante y EN .REC.

REQUISITOS PARA PARTICIPAR
— Contar con un proyecto musical activo (solista o banda).
— Tener material disponible para escuchar (Spotify, YouTube u otras plataformas).
— Contar con registro audiovisual en vivo (shows o sesiones sin edición excesiva).
— Enviar una breve descripción del proyecto artístico.
— Tener redes sociales activas.

2. CRITERIOS DE SELECCIÓN
La convocatoria está orientada a proyectos con identidad artística definida y propuesta propia.
— Se valorará especialmente la originalidad, la interpretación en vivo y la búsqueda estética del proyecto.
— No se priorizará la cantidad de seguidores ni métricas de redes sociales.
— La selección estará basada en la afinidad artística y conceptual con la identidad de EN .REC.
— El proyecto deberá tener disponibilidad y predisposición para participar activamente del proceso creativo y producción de la sesión.
— Se valorará la capacidad de reinterpretar o adaptar el material musical al formato de sesión en vivo.

El equipo de EN .REC realizará una revisión de todos los proyectos recibidos y seleccionará un conjunto de finalistas. Entre los finalistas se elegirá un proyecto ganador. EN .REC se reserva el derecho de realizar dicha selección sin necesidad de justificación pública.

3. SOBRE LA SESIÓN
— La locación, formato y propuesta estética serán definidas en conjunto entre EN .REC y el proyecto seleccionado.
— EN .REC se reserva el derecho de adaptar el formato de la sesión según necesidades artísticas o de producción.
— Las sesiones serán desarrolladas creativamente en conjunto con el/la artista o banda seleccionada.
— La sesión final será publicada en las plataformas oficiales de EN .REC.

4. DERECHOS
El proyecto seleccionado recibirá una sesión en vivo grabada y producida por el equipo de EN .REC. La sesión será publicada en los canales oficiales de EN .REC (YouTube, Instagram y/u otras plataformas). EN .REC conservará los derechos de producción audiovisual de la sesión. El artista/banda conservará los derechos sobre su música.

5. ORIGINALIDAD
Al postularse, el participante declara que el proyecto presentado es de su autoría y que cuenta con los derechos necesarios sobre el material musical que eventualmente se grabaría. EN .REC no se hace responsable de conflictos de derechos sobre el material artístico.

6. DATOS PERSONALES
Los datos aportados en este formulario serán utilizados exclusivamente para la gestión de la convocatoria Radar EN .REC. No serán cedidos a terceros ni utilizados con fines comerciales ajenos a EN .REC.

7. CIERRE DE INSCRIPCIONES
Las inscripciones estarán abiertas hasta el 31 de Julio de 2026 a las 23:59 (hora de Argentina). Los formularios recibidos fuera de ese plazo no serán considerados.

8. COMUNICACIÓN
EN .REC contactará únicamente a los proyectos seleccionados como finalistas. Si no recibís respuesta dentro de las 4 semanas posteriores al cierre de inscripciones, se entiende que el proyecto no fue seleccionado en esta edición.

9. MODIFICACIONES
EN .REC se reserva el derecho de modificar o cancelar la convocatoria en cualquier momento, informando a través de sus canales oficiales.

Al enviar este formulario, declarás haber leído y aceptado íntegramente estos términos y condiciones.`;

type VerifyStatus = "idle" | "loading" | "verified" | "couldBePrivate" | "not_subscribed" | "not_found" | "no_api" | "error";

type FormData = {
  artista: string;
  email: string;
  genero: string;
  spotify: string;
  youtube: string;
  instagram: string;
  descripcion: string;
  respuesta1: string;
  respuesta1Comment: string;
  respuesta2: string;
  respuesta2Comment: string;
  ytChannel: string;
  tyc: boolean;
};

type Errors = Partial<Record<keyof FormData, string>>;

const initialData: FormData = {
  artista: "",
  email: "",
  genero: "",
  spotify: "",
  youtube: "",
  instagram: "",
  descripcion: "",
  respuesta1: "",
  respuesta1Comment: "",
  respuesta2: "",
  respuesta2Comment: "",
  ytChannel: "",
  tyc: false,
};

function validate(data: FormData, verifyStatus: VerifyStatus): Errors {
  const errs: Errors = {};
  if (!data.artista.trim()) errs.artista = "Requerido";
  if (!data.email.trim()) {
    errs.email = "Requerido";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errs.email = "Email inválido";
  }
  if (!data.genero.trim()) errs.genero = "Requerido";
  if (!data.youtube.trim()) errs.youtube = "Requerido";
  if (!data.instagram.trim()) errs.instagram = "Requerido";
  if (!data.descripcion.trim()) errs.descripcion = "Requerido";
  if (!data.respuesta1.trim() || isNaN(Number(data.respuesta1))) errs.respuesta1 = "Ingresá un número";
  if (!data.respuesta2.trim() || isNaN(Number(data.respuesta2))) errs.respuesta2 = "Ingresá un número";

  // Validación de suscripción
  if (!data.ytChannel.trim()) {
    errs.ytChannel = "Ingresá el link o handle de tu canal de YouTube";
  } else if (verifyStatus === "idle") {
    errs.ytChannel = "Verificá tu suscripción antes de enviar";
  } else if (verifyStatus === "not_found") {
    errs.ytChannel = "Canal no encontrado. Revisá el handle o link ingresado";
  } else if (verifyStatus === "not_subscribed") {
    errs.ytChannel = "No estás suscripto al canal de EN .REC. Suscribite y volvé a verificar";
  } else if (verifyStatus === "couldBePrivate") {
    errs.ytChannel = "Tus suscripciones son privadas y no podemos verificarte. Hacelas públicas en YouTube, suscribite a EN .REC y volvé a verificar";
  }

  if (!data.tyc) errs.tyc = "Debés aceptar los términos y condiciones";
  return errs;
}

const SESSION_KEY = "radar_draft";

export default function Radar() {
  const [form, setForm] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<Errors>({});
  const [tycOpen, setTycOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error" | "outdated">("idle");
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifiedChannelTitle, setVerifiedChannelTitle] = useState("");
  const [activeSet, setActiveSet] = useState<ActiveSet | null>(null);

  useEffect(() => {
    // Restaurar borrador si viene de un reload por formulario desactualizado
    const draft = sessionStorage.getItem(SESSION_KEY);
    if (draft) {
      try { setForm(JSON.parse(draft)); } catch { /* ignore */ }
      sessionStorage.removeItem(SESSION_KEY);
    }
    // Cargar el set de preguntas activo para hoy
    fetch("/api/radar/preguntas/activo")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.id) setActiveSet(data); })
      .catch(() => { /* usar defaults */ });
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const val =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    // Reset verificación si cambia el campo de canal
    if (name === "ytChannel") {
      setVerifyStatus("idle");
      setVerifiedChannelTitle("");
    }
  };

  const handleVerify = async () => {
    if (!form.ytChannel.trim()) return;
    setVerifyStatus("loading");
    try {
      const res = await fetch(
        `/api/radar/verify-subscription?channel=${encodeURIComponent(form.ytChannel.trim())}`
      );
      const data = await res.json();
      if (data.noApi) {
        setVerifyStatus("no_api");
      } else if (!data.exists) {
        setVerifyStatus("not_found");
      } else if (data.subscribed) {
        setVerifyStatus("verified");
        setVerifiedChannelTitle(data.channelTitle ?? "");
      } else if (data.couldBePrivate) {
        setVerifyStatus("couldBePrivate");
        setVerifiedChannelTitle(data.channelTitle ?? "");
      } else {
        setVerifyStatus("not_subscribed");
        setVerifiedChannelTitle(data.channelTitle ?? "");
      }
    } catch {
      setVerifyStatus("error");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(form, verifyStatus);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstErrorKey = Object.keys(errs)[0];
      document.querySelector(`[name="${firstErrorKey}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    setStatus("sending");

    const payload = {
      artista:              form.artista,
      email:                form.email,
      genero:               form.genero,
      spotify:              form.spotify,
      youtube:              form.youtube,
      instagram:            form.instagram,
      descripcion:          form.descripcion,
      respuesta1:           form.respuesta1 + (form.respuesta1Comment.trim() ? ` | ${form.respuesta1Comment.trim()}` : ""),
      respuesta2:           form.respuesta2 + (form.respuesta2Comment.trim() ? ` | ${form.respuesta2Comment.trim()}` : ""),
      ytChannel:            form.ytChannel,
      ytSubscribedVerified: verifyStatus === "verified",
      preguntaSetId:        activeSet?.id,
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        gtmPush({ event: "radar_form_submit" });
        gtagConversion(import.meta.env.VITE_GTAG_CONVERSION_LABEL);
        setStatus("success");
        setForm(initialData);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const body = await res.json().catch(() => ({}));
        if (body?.message?.code === "outdated_form" || body?.code === "outdated_form") {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(form));
          setStatus("outdated");
        } else {
          setStatus("error");
        }
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "outdated") {
    return (
      <div className={styles.successScreen}>
        <div className={styles.successCard}>
          <div className={styles.successDot} style={{ background: "#fbbf24" }} />
          <h1 className={styles.successTitle}>Tu formulario está desactualizado</h1>
          <p className={styles.successText}>
            Actualizamos el formulario de inscripción. Por favor recargá la página para acceder a la versión más reciente y volvé a completarlo.
          </p>
          <button
            className={styles.reloadBtn}
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className={styles.successScreen}>
        <div className={styles.successCard}>
          <div className={styles.successDot} />
          <h1 className={styles.successTitle}>¡Postulación enviada!</h1>
          <p className={styles.successText}>
            Recibimos tu formulario. Revisaremos todos los proyectos y, si quedás entre los
            finalistas, te contactaremos al email que dejaste.
          </p>
          <p className={styles.successSub}>
            Recordá que el cierre de inscripciones es el <strong>31 de Julio de 2026</strong>.
          </p>
        </div>
      </div>
    );
  }

  const q = activeSet ?? DEFAULTS;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.formHeader}>
          <h1 className={styles.title}>
            <svg className={styles.radarIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
              <path d="M15.51 15.56a5 5 0 1 0 -3.51 1.44" />
              <path d="M18.832 17.86a9 9 0 1 0 -6.832 3.14" />
              <path d="M12 12v9" />
            </svg>
            Radar <span className={styles.titleBrand}>EN .REC</span>
          </h1>
          <p className={styles.subtitle}>
            Estamos buscando un nuevo proyecto musical para grabar una sesión en vivo junto a EN
            .REC. Si tenés un proyecto solista o una banda, completá este formulario y mostranos
            lo que hacés.
          </p>
          <p className={styles.subtitleNote}>
            Entre todos los proyectos recibidos, el equipo de EN .REC realizará una selección de
            finalistas y elegirá un proyecto ganador.
          </p>
          <div className={styles.deadline}>
            📍 Las inscripciones están abiertas hasta el <strong>31 de Julio de 2026</strong>.
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          {/* Datos del proyecto */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Tu proyecto</legend>

            <div className={styles.field}>
              <label className={styles.label}>
                Nombre del ARTISTA / BANDA <span className={styles.req}>*</span>
              </label>
              <input
                name="artista"
                value={form.artista}
                onChange={handleChange}
                className={`${styles.input} ${errors.artista ? styles.inputError : ""}`}
                placeholder="Nombre artístico o de la banda"
              />
              {errors.artista && <p className={styles.error}>{errors.artista}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Email de contacto <span className={styles.req}>*</span>
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                placeholder="tu@email.com"
              />
              {errors.email && <p className={styles.error}>{errors.email}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Género musical <span className={styles.req}>*</span>
              </label>
              <input
                name="genero"
                value={form.genero}
                onChange={handleChange}
                className={`${styles.input} ${errors.genero ? styles.inputError : ""}`}
                placeholder="Ej: Folk, Indie rock, Jazz, Pop alternativo..."
              />
              {errors.genero && <p className={styles.error}>{errors.genero}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Link perfil Spotify</label>
              <input
                name="spotify"
                value={form.spotify}
                onChange={handleChange}
                className={styles.input}
                placeholder="https://open.spotify.com/artist/..."
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Link perfil YouTube <span className={styles.req}>*</span>
              </label>
              <input
                name="youtube"
                value={form.youtube}
                onChange={handleChange}
                className={`${styles.input} ${errors.youtube ? styles.inputError : ""}`}
                placeholder="https://www.youtube.com/@..."
              />
              {errors.youtube && <p className={styles.error}>{errors.youtube}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Link perfil Instagram <span className={styles.req}>*</span>
              </label>
              <input
                name="instagram"
                value={form.instagram}
                onChange={handleChange}
                className={`${styles.input} ${errors.instagram ? styles.inputError : ""}`}
                placeholder="https://www.instagram.com/..."
              />
              {errors.instagram && <p className={styles.error}>{errors.instagram}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Descripción breve del proyecto artístico <span className={styles.req}>*</span>
              </label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                rows={5}
                className={`${styles.textarea} ${errors.descripcion ? styles.inputError : ""}`}
                placeholder="Contanos quiénes son, qué hacen, cuánto tiempo llevan como proyecto, qué referentes tienen, qué los hace únicos..."
              />
              {errors.descripcion && <p className={styles.error}>{errors.descripcion}</p>}
            </div>
          </fieldset>

          {/* Preguntas sobre videos */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Mirá los videos y contestá</legend>

            <div className={styles.watchNote}>
              <p>
                Sugerencia: mirá las sesiones enteras porque las preguntas son capciosas. No son
                difíciles, pero solo podrán participar quienes estén atentos y contesten bien.
              </p>
            </div>

            {/* Video 1 */}
            <div className={styles.videoBlock}>
              <p className={styles.videoLabel}>{q.p1_etiqueta}</p>
              <div className={styles.embedWrapper}>
                <iframe
                  src={toEmbedUrl(q.p1_youtube_url)}
                  title={q.p1_etiqueta}
                  style={{ border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={styles.embed}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  {q.p1_pregunta}{" "}
                  <span className={styles.req}>*</span>
                </label>
                <div className={styles.answerRow}>
                  <input
                    type="number"
                    name="respuesta1"
                    value={form.respuesta1}
                    onChange={handleChange}
                    min="0"
                    className={`${styles.inputNum} ${errors.respuesta1 ? styles.inputError : ""}`}
                    placeholder="Número"
                  />
                  <input
                    name="respuesta1Comment"
                    value={form.respuesta1Comment}
                    onChange={handleChange}
                    className={styles.inputComment}
                    placeholder="Comentario opcional..."
                  />
                </div>
                {errors.respuesta1 && <p className={styles.error}>{errors.respuesta1}</p>}
              </div>
            </div>

            {/* Video 2 */}
            <div className={styles.videoBlock}>
              <p className={styles.videoLabel}>{q.p2_etiqueta}</p>
              <div className={styles.embedWrapper}>
                <iframe
                  src={toEmbedUrl(q.p2_youtube_url)}
                  title={q.p2_etiqueta}
                  style={{ border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={styles.embed}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  {q.p2_pregunta} <span className={styles.req}>*</span>
                </label>
                <div className={styles.answerRow}>
                  <input
                    type="number"
                    name="respuesta2"
                    value={form.respuesta2}
                    onChange={handleChange}
                    min="0"
                    className={`${styles.inputNum} ${errors.respuesta2 ? styles.inputError : ""}`}
                    placeholder="Número"
                  />
                  <input
                    name="respuesta2Comment"
                    value={form.respuesta2Comment}
                    onChange={handleChange}
                    className={styles.inputComment}
                    placeholder="Comentario opcional..."
                  />
                </div>
                {errors.respuesta2 && <p className={styles.error}>{errors.respuesta2}</p>}
              </div>
            </div>
          </fieldset>

          {/* Suscripción al canal */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Suscripción al canal</legend>

            <div className={styles.ytSubscribeBlock}>
              <div className={styles.ytSubscribeText}>
                <p className={styles.ytSubscribeTitle}>Suscribite al canal de EN .REC</p>
                <p className={styles.ytSubscribeSub}>
                  Es un requisito para participar. Ingresá el link de tu canal para verificarlo.
                </p>
              </div>
              <a
                href="https://www.youtube.com/@En.REC-?sub_confirmation=1"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ytSubscribeBtn}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                Ir al canal y suscribirme
              </a>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Tu canal de YouTube <span className={styles.req}>*</span>
              </label>
              <div className={styles.verifyRow}>
                <input
                  name="ytChannel"
                  value={form.ytChannel}
                  onChange={handleChange}
                  placeholder="@tucanal o youtube.com/@tucanal"
                  className={`${styles.input} ${errors.ytChannel ? styles.inputError : ""} ${verifyStatus === "verified" ? styles.inputOk : ""}`}
                />
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={!form.ytChannel.trim() || verifyStatus === "loading"}
                  className={styles.verifyBtn}
                >
                  {verifyStatus === "loading" ? "Verificando..." : "Verificar"}
                </button>
              </div>
              {errors.ytChannel && <p className={styles.error}>{errors.ytChannel}</p>}

              {/* Resultados de la verificación */}
              {verifyStatus === "verified" && (
                <div className={styles.verifyResult + " " + styles.verifyOk}>
                  ✅ Suscripción confirmada{verifiedChannelTitle ? ` — ${verifiedChannelTitle}` : ""}
                </div>
              )}
              {verifyStatus === "not_found" && (
                <div className={styles.verifyResult + " " + styles.verifyFail}>
                  ❌ Canal no encontrado. Revisá el handle o link ingresado.
                </div>
              )}
              {verifyStatus === "couldBePrivate" && (
                <div className={styles.verifyResult + " " + styles.verifyWarn}>
                  ⚠️ Encontramos tu canal pero tus suscripciones están configuradas como privadas en YouTube.
                  No podemos confirmar automáticamente. Asegurate de estar suscripto a{" "}
                  <a href="https://www.youtube.com/@En.REC-?sub_confirmation=1" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>EN .REC</a>{" "}
                  antes de enviar.
                </div>
              )}
              {verifyStatus === "not_subscribed" && (
                <div className={styles.verifyResult + " " + styles.verifyFail}>
                  ❌ No estás suscripto al canal de EN .REC. Suscribite y volvé a verificar.
                </div>
              )}
              {(verifyStatus === "no_api" || verifyStatus === "error") && (
                <div className={styles.verifyResult + " " + styles.verifyWarn}>
                  ⚠️ No pudimos conectar con YouTube en este momento. Intentá de nuevo.
                </div>
              )}
            </div>
          </fieldset>

          {/* Términos y condiciones */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Términos y condiciones</legend>

            <div className={styles.tycContainer}>
              <button
                type="button"
                className={styles.tycToggle}
                onClick={() => setTycOpen((v) => !v)}
                aria-expanded={tycOpen}
              >
                <span>Leer términos y condiciones completos</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: tycOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {tycOpen && (
                <div className={styles.tycScroll}>
                  <pre className={styles.tycText}>{TYC_TEXT}</pre>
                </div>
              )}

              <label className={`${styles.checkboxLabel} ${errors.tyc ? styles.checkboxError : ""}`}>
                <input
                  type="checkbox"
                  name="tyc"
                  checked={form.tyc}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                <span>
                  Acepto los términos y condiciones <span className={styles.req}>*</span>
                </span>
              </label>
              {errors.tyc && <p className={styles.error}>{errors.tyc}</p>}
            </div>
          </fieldset>

          {status === "error" && (
            <div className={styles.errorBanner}>
              Hubo un error al enviar el formulario. Revisá tu conexión e intentá de nuevo.
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={status === "sending"}
          >
            {status === "sending" ? "Enviando..." : "Enviar postulación"}
          </button>
        </form>
      </div>
    </div>
  );
}
