import { useState, useEffect } from "react";
import styles from "./Admin.module.css";

const CORRECT_R1 = "3"; // fallback para postulaciones sin set
const CORRECT_R2 = "6";

const DEFAULT_P1_LABEL = "Sesión #7 — Francisca y Los Exploradores";
const DEFAULT_P1_Q = "¿Cuántas veces aparecen los camarógrafos en cámara?";
const DEFAULT_P2_LABEL = "Sesión #8 — Mariana Michi";
const DEFAULT_P2_Q = "¿Cuántos riffs y/o solos toca el guitarrista a lo largo de la sesión?";

const DIAS_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function checkAnswer(answer: string, correct: string) {
  return answer.split("|")[0].trim() === correct;
}

// Retorna true si hay evidencia de que vio la sesión:
// respondió bien (beneficio de la duda) O respondió mal pero escribió una aclaración
function watchedSession(answer: string, correct: string) {
  if (checkAnswer(answer, correct)) return true;
  const clarification = answer.split("|")[1]?.trim() ?? "";
  return clarification.length > 0;
}

function toEmbedUrl(url: string): string {
  if (!url) return "";
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  return url;
}

type Postulacion = {
  id: number;
  artista: string;
  email: string;
  genero: string;
  spotify: string | null;
  youtube: string;
  instagram: string;
  descripcion: string;
  respuesta1: string;
  respuesta2: string;
  yt_channel: string | null;
  yt_subscribed_verified: boolean;
  ip_address: string | null;
  pregunta_set_id: number | null;
  created_at: string;
  estrellas: number | null;
  aclaro_respuestas: boolean | null;
  calidad_proyecto: number | null;
  calidad_artista: number | null;
  repertorio: number | null;
  presencia_camara: number | null;
  compatibilidad: number | null;
};

type PreguntaSet = {
  id: number;
  nombre: string;
  dias: number[];
  activo: boolean;
  es_default: boolean;
  p1_etiqueta: string;
  p1_pregunta: string;
  p1_youtube_url: string;
  p1_respuesta_correcta: string;
  p2_etiqueta: string;
  p2_pregunta: string;
  p2_youtube_url: string;
  p2_respuesta_correcta: string;
};

type SetForm = Omit<PreguntaSet, "id"> & { id?: number };

type Youtubestat = {
  nombre: string;
  videoId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string | null;
  thumbnail: string | null;
  deltaViews: number | null;
  deltaLikes: number | null;
  baselineCapturedAt: string | null;
};

const emptySetForm = (): SetForm => ({
  nombre: "",
  dias: [],
  activo: true,
  es_default: false,
  p1_etiqueta: "",
  p1_pregunta: "",
  p1_youtube_url: "",
  p1_respuesta_correcta: "",
  p2_etiqueta: "",
  p2_pregunta: "",
  p2_youtube_url: "",
  p2_respuesta_correcta: "",
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") ?? "");
  const [input, setInput] = useState("");
  const [data, setData] = useState<Postulacion[] | null>(null);
  const [sets, setSets] = useState<PreguntaSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"postulaciones" | "preguntas" | "estadisticas" | "calificacion">("postulaciones");
  const [editingSet, setEditingSet] = useState<SetForm | null>(null);
  const [savingSet, setSavingSet] = useState(false);
  const [setsError, setSetsError] = useState("");
  const [ytStats, setYtStats] = useState<Youtubestat[] | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [ga4, setGa4] = useState<{ total: number; pages: Record<string, number> } | null>(null);
  const [visitStats, setVisitStats] = useState<{ uniqueVisitors: number; totalPageViews: number } | null>(null);
  const [baselineDate, setBaselineDate] = useState<string | null>(null);
  const [capturingBaseline, setCapturingBaseline] = useState(false);

  const authHeaders = (t: string) => ({ Authorization: `Bearer ${t}` });

  const fetchData = async (t: string) => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/radar/admin/postulaciones", { headers: authHeaders(t) });
      if (res.status === 401) {
        setError("Token incorrecto."); setToken("");
        sessionStorage.removeItem("admin_token"); setData(null); return;
      }
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setError("No se pudo conectar con el servidor."); setData(null); }
    finally { setLoading(false); }
  };

  const fetchSets = async (t: string) => {
    try {
      const res = await fetch("/api/radar/admin/pregunta-sets", { headers: authHeaders(t) });
      if (res.ok) setSets(await res.json());
    } catch { /* silent */ }
  };

  const fetchYtStats = async (t: string) => {
    setYtLoading(true);
    try {
      const res = await fetch("/api/radar/admin/youtube-stats", { headers: authHeaders(t) });
      if (res.ok) setYtStats(await res.json());
    } catch { /* silent */ }
    finally { setYtLoading(false); }
  };

  const fetchBaseline = async (t: string) => {
    try {
      const res = await fetch("/api/radar/admin/youtube-baseline", { headers: authHeaders(t) });
      if (res.ok) {
        const json = await res.json();
        setBaselineDate(json.capturedAt ?? null);
      }
    } catch { /* silent */ }
  };

  const captureBaseline = async () => {
    if (!confirm("¿Fijar baseline ahora? Esto guardará los views y likes actuales como referencia de la campaña.")) return;
    setCapturingBaseline(true);
    try {
      await fetch("/api/radar/admin/youtube-baseline", { method: "POST", headers: authHeaders(token) });
      await fetchYtStats(token);
      await fetchBaseline(token);
    } catch { /* silent */ }
    finally { setCapturingBaseline(false); }
  };

  const fetchGa4 = async (t: string) => {
    try {
      const res = await fetch("/api/radar/admin/realtime", { headers: authHeaders(t) });
      if (res.ok) setGa4(await res.json());
    } catch { /* silent */ }
  };

  const fetchVisitStats = async (t: string) => {
    try {
      const res = await fetch("/api/radar/admin/visit-stats", { headers: authHeaders(t) });
      if (res.ok) setVisitStats(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!token) return;
    fetchData(token); fetchSets(token); fetchYtStats(token); fetchGa4(token); fetchBaseline(token); fetchVisitStats(token);
    const interval = setInterval(() => { fetchGa4(token); fetchVisitStats(token); }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sessionStorage.setItem("admin_token", input.trim());
    setToken(input.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setToken(""); setData(null); setInput(""); setSets([]);
  };

  // ── Respuestas correctas dinámicas por postulación ────────────────────────
  const getCorrectAnswers = (p: Postulacion) => {
    if (p.pregunta_set_id != null) {
      const set = sets.find((s) => s.id === p.pregunta_set_id);
      if (set) return { r1: set.p1_respuesta_correcta, r2: set.p2_respuesta_correcta, set };
    }
    return { r1: CORRECT_R1, r2: CORRECT_R2, set: null };
  };

  const getSetLabel = (p: Postulacion) => {
    if (p.pregunta_set_id == null) return null;
    const set = sets.find((s) => s.id === p.pregunta_set_id);
    return set ? set.nombre : `Set #${p.pregunta_set_id}`;
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = (rows: Postulacion[]) => {
    const headers = [
      "ID","Artista","Email","Género","Spotify","YouTube","Instagram",
      "Descripción","Set","R1","R1 OK","R2","R2 OK",
      "Canal YT","YT Verificado","IP","Fecha",
    ];
    const csvRows = rows.map((p) => {
      const { r1, r2 } = getCorrectAnswers(p);
      return [
        p.id, p.artista, p.email, p.genero, p.spotify ?? "",
        p.youtube, p.instagram,
        `"${p.descripcion.replace(/"/g, '""')}"`,
        getSetLabel(p) ?? "default",
        `"${p.respuesta1.replace(/"/g, '""')}"`,
        checkAnswer(p.respuesta1, r1) ? "SI" : "NO",
        `"${p.respuesta2.replace(/"/g, '""')}"`,
        checkAnswer(p.respuesta2, r2) ? "SI" : "NO",
        p.yt_channel ?? "", p.yt_subscribed_verified ? "SI" : "NO",
        p.ip_address ?? "", formatDate(p.created_at),
      ];
    });
    const csv = [headers, ...csvRows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `radar-enrec-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Postulacion delete ────────────────────────────────────────────────────
  const deletePostulacion = async (id: number) => {
    if (!confirm(`¿Eliminar la postulación #${id}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/radar/admin/postulaciones/${id}`, {
      method: "DELETE", headers: authHeaders(token),
    });
    setData((prev) => prev?.filter((p) => p.id !== id) ?? null);
    if (expanded === id) setExpanded(null);
  };

  // ── Score patch ──────────────────────────────────────────────────────────
  const patchScore = async (id: number, patch: Partial<Postulacion>) => {
    setData((prev) => prev?.map((p) => p.id === id ? { ...p, ...patch } : p) ?? null);
    try {
      await fetch(`/api/radar/admin/postulaciones/${id}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify(patch),
      });
    } catch { /* silent */ }
  };

  // ── Set CRUD ──────────────────────────────────────────────────────────────
  const saveSet = async () => {
    if (!editingSet) return;
    setSavingSet(true); setSetsError("");
    try {
      const isNew = !editingSet.id;
      const url = isNew
        ? "/api/radar/admin/pregunta-sets"
        : `/api/radar/admin/pregunta-sets/${editingSet.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          ...editingSet,
          p1_youtube_url: toEmbedUrl(editingSet.p1_youtube_url),
          p2_youtube_url: toEmbedUrl(editingSet.p2_youtube_url),
        }),
      });
      if (!res.ok) { setSetsError("Error al guardar. Revisá los campos."); return; }
      await fetchSets(token);
      setEditingSet(null);
    } catch { setSetsError("Error de conexión."); }
    finally { setSavingSet(false); }
  };

  const deleteSet = async (id: number) => {
    if (!confirm("¿Eliminar este set de preguntas?")) return;
    await fetch(`/api/radar/admin/pregunta-sets/${id}`, {
      method: "DELETE", headers: authHeaders(token),
    });
    await fetchSets(token);
    if (editingSet?.id === id) setEditingSet(null);
  };

  const toggleDay = (day: number) => {
    if (!editingSet) return;
    const dias = editingSet.dias ?? [];
    setEditingSet({
      ...editingSet,
      dias: dias.includes(day) ? dias.filter((d) => d !== day) : [...dias, day],
    });
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className={styles.loginScreen}>
        <form onSubmit={handleLogin} className={styles.loginCard}>
          <h1 className={styles.loginTitle}>Admin EN .REC</h1>
          <p className={styles.loginSub}>Radar — Postulaciones</p>
          <input
            type="password" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Token de acceso" className={styles.loginInput} autoFocus
          />
          {error && <p className={styles.loginError}>{error}</p>}
          <button type="submit" className={styles.loginBtn}>Ingresar</button>
        </form>
      </div>
    );
  }

  const okCount = data?.filter((p) => {
    const { r1, r2 } = getCorrectAnswers(p);
    return checkAnswer(p.respuesta1, r1) && checkAnswer(p.respuesta2, r2);
  }).length ?? 0;

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1 className={styles.pageTitle}>Radar EN .REC</h1>
          {data && <span className={styles.badge}>{data.length} postulación{data.length !== 1 ? "es" : ""}</span>}
          {data && okCount > 0 && <span className={styles.badgeOk}>{okCount} con respuestas correctas ✓</span>}
        </div>
        <div className={styles.topBarRight}>
          {activeTab === "postulaciones" && data && data.length > 0 && (
            <button className={styles.exportBtn} onClick={() => exportCSV(data)}>Exportar CSV</button>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>Salir</button>
        </div>
      </div>

      {/* ── Cards permanentes — siempre visibles ── */}
      {data && (() => {
        const total = data.length;
        const bothOk = data.filter((p) => { const { r1, r2 } = getCorrectAnswers(p); return checkAnswer(p.respuesta1, r1) && checkAnswer(p.respuesta2, r2); }).length;
        const oneOk  = data.filter((p) => { const { r1, r2 } = getCorrectAnswers(p); const a = checkAnswer(p.respuesta1, r1); const b = checkAnswer(p.respuesta2, r2); return (a && !b) || (!a && b); }).length;
        const noneOk = data.filter((p) => { const { r1, r2 } = getCorrectAnswers(p); return !checkAnswer(p.respuesta1, r1) && !checkAnswer(p.respuesta2, r2); }).length;
        return (
          <div className={styles.permanentCards}>
            <div className={styles.statCard}><span className={styles.statNum}>{total}</span><span className={styles.statLabel}>Inscriptos</span></div>
            <div className={`${styles.statCard} ${styles.statCardOk}`}><span className={styles.statNum}>{bothOk}</span><span className={styles.statLabel}>Ambas correctas</span></div>
            <div className={`${styles.statCard} ${styles.statCardHalf}`}><span className={styles.statNum}>{oneOk}</span><span className={styles.statLabel}>Una correcta</span></div>
            <div className={`${styles.statCard} ${styles.statCardNone}`}><span className={styles.statNum}>{noneOk}</span><span className={styles.statLabel}>Ninguna correcta</span></div>
            <div className={styles.statCard}>
              <span className={styles.statNum}>{visitStats ? visitStats.uniqueVisitors.toLocaleString("es-AR") : "—"}</span>
              <span className={styles.statLabel}>Visitantes únicos</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNum}>{visitStats ? visitStats.totalPageViews.toLocaleString("es-AR") : "—"}</span>
              <span className={styles.statLabel}>Páginas vistas</span>
            </div>
            <div className={`${styles.statCard} ${styles.statCardLive}`}>
              <span className={styles.statNum}>{ga4 ? ga4.total : "—"}</span>
              <span className={styles.statLabel}>🔴 Usuarios ahora</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNum}>{ga4 ? (ga4.pages["/"] ?? 0) : "—"}</span>
              <span className={styles.statLabel}>🔴 En Home ahora</span>
            </div>
            <div className={`${styles.statCard} ${styles.statCardOk}`}>
              <span className={styles.statNum}>{ga4 ? (ga4.pages["/radar"] ?? 0) : "—"}</span>
              <span className={styles.statLabel}>🔴 En /radar ahora</span>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className={styles.tabsBar}>
        <button
          className={`${styles.tab} ${activeTab === "postulaciones" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("postulaciones")}
        >
          Postulaciones
        </button>
        <button
          className={`${styles.tab} ${activeTab === "preguntas" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("preguntas")}
        >
          Preguntas
        </button>
        <button
          className={`${styles.tab} ${activeTab === "estadisticas" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("estadisticas")}
        >
          Estadísticas
        </button>
        <button
          className={`${styles.tab} ${activeTab === "calificacion" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("calificacion")}
        >
          Calificación
        </button>
      </div>

      {/* ── Tab: Postulaciones ── */}
      {activeTab === "postulaciones" && (
        <>
          {loading && <p className={styles.loading}>Cargando...</p>}
          {error && <p className={styles.errorMsg}>{error}</p>}
          {data && data.length === 0 && <p className={styles.empty}>Todavía no hay postulaciones.</p>}
          {data && data.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Artista / Banda</th>
                    <th>★</th>
                    <th>Género</th>
                    <th>Email</th>
                    <th>Instagram</th>
                    <th>YouTube</th>
                    <th>Set</th>
                    <th>P1 R.</th>
                    <th>P2 R.</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => {
                    const { r1, r2 } = getCorrectAnswers(p);
                    const r1num = p.respuesta1.split("|")[0].trim();
                    const r2num = p.respuesta2.split("|")[0].trim();
                    const r1ok = checkAnswer(p.respuesta1, r1);
                    const r2ok = checkAnswer(p.respuesta2, r2);
                    const allOk = r1ok && r2ok;
                    const noneOk = !r1ok && !r2ok;
                    const setLabel = getSetLabel(p);
                    return (
                      <>
                        <tr
                          key={p.id}
                          className={`${styles.row} ${expanded === p.id ? styles.rowActive : ""} ${allOk ? styles.rowOk : ""}`}
                          onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                        >
                          <td className={styles.idCell}>{p.id}</td>
                          <td className={styles.artistCell}>{p.artista}</td>
                          <td className={styles.starsCell} onClick={(e) => e.stopPropagation()}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <span
                                key={n}
                                className={`${styles.star} ${(p.estrellas ?? 0) >= n ? styles.starFilled : styles.starEmpty}`}
                                onClick={() => patchScore(p.id, { estrellas: p.estrellas === n ? null : n })}
                              >★</span>
                            ))}
                          </td>
                          <td>{p.genero}</td>
                          <td>
                            <a href={`mailto:${p.email}`} className={styles.link} onClick={(e) => e.stopPropagation()}>
                              {p.email}
                            </a>
                          </td>
                          <td>
                            <a href={p.instagram} target="_blank" rel="noopener noreferrer" className={styles.link} onClick={(e) => e.stopPropagation()}>IG ↗</a>
                          </td>
                          <td>
                            <a href={p.youtube} target="_blank" rel="noopener noreferrer" className={styles.link} onClick={(e) => e.stopPropagation()}>YT ↗</a>
                          </td>
                          <td className={styles.setLabelCell}>
                            {setLabel ? <span className={styles.setChip}>{setLabel}</span> : <span className={styles.setChipDefault}>—</span>}
                          </td>
                          <td className={styles.answerNumCell}>
                            <span className={r1ok ? styles.numOk : styles.numWrong}>{r1num || "—"}</span>
                          </td>
                          <td className={styles.answerNumCell}>
                            <span className={r2ok ? styles.numOk : styles.numWrong}>{r2num || "—"}</span>
                          </td>
                          <td>
                            {allOk && <span className={styles.answerBadgeOk}>✓ Correctas</span>}
                            {!allOk && !noneOk && <span className={styles.answerBadgeHalf}>1/2</span>}
                            {noneOk && <span className={styles.answerBadgeNone}>✗ Incorrectas</span>}
                          </td>
                          <td className={styles.dateCell}>{formatDate(p.created_at)}</td>
                          <td className={styles.chevron}>
                            <div className={styles.chevronCell}>
                              <span>{expanded === p.id ? "▲" : "▼"}</span>
                              <button
                                className={styles.deleteRowBtn}
                                onClick={(e) => { e.stopPropagation(); deletePostulacion(p.id); }}
                                title="Eliminar postulación"
                              >✕</button>
                            </div>
                          </td>
                        </tr>

                        {expanded === p.id && (() => {
                          const { r1, r2, set } = getCorrectAnswers(p);
                          const r1ok = checkAnswer(p.respuesta1, r1);
                          const r2ok = checkAnswer(p.respuesta2, r2);
                          return (
                            <tr key={`${p.id}-detail`} className={styles.detailRow}>
                              <td colSpan={13}>
                                <div className={styles.detail}>
                                  <div className={styles.detailGrid}>
                                    <div className={styles.detailBlock}>
                                      <span className={styles.detailLabel}>Descripción del proyecto</span>
                                      <p className={styles.detailText}>{p.descripcion}</p>
                                    </div>
                                    <div className={styles.detailBlock}>
                                      <span className={styles.detailLabel}>Spotify</span>
                                      <p className={styles.detailText}>
                                        {p.spotify ? <a href={p.spotify} target="_blank" rel="noopener noreferrer" className={styles.link}>{p.spotify}</a> : "—"}
                                      </p>
                                    </div>
                                    <div className={styles.detailBlock}>
                                      <span className={styles.detailLabel}>Canal de YouTube declarado</span>
                                      <p className={styles.detailText}>
                                        {p.yt_channel
                          ? <a href={p.yt_channel.startsWith("http") ? p.yt_channel : `https://youtube.com/${p.yt_channel}`} target="_blank" rel="noopener noreferrer" className={styles.link}>{p.yt_channel}</a>
                          : "—"}
                                        {" "}
                                        {p.yt_subscribed_verified
                                          ? <span className={styles.verifiedBadge}>✓ Suscripción verificada</span>
                                          : <span className={styles.unverifiedBadge}>Sin verificar</span>}
                                      </p>
                                    </div>
                                    <div className={styles.detailBlock}>
                                      <span className={styles.detailLabel}>
                                        P1 — {set?.p1_etiqueta ?? "Francisca"} <em>(correcta: {r1})</em>
                                      </span>
                                      <p className={r1ok ? styles.answerOk : styles.answerWrong}>
                                        {r1ok ? "✓" : "✗"} {p.respuesta1}
                                      </p>
                                    </div>
                                    <div className={styles.detailBlock}>
                                      <span className={styles.detailLabel}>
                                        P2 — {set?.p2_etiqueta ?? "Michi"} <em>(correcta: {r2})</em>
                                      </span>
                                      <p className={r2ok ? styles.answerOk : styles.answerWrong}>
                                        {r2ok ? "✓" : "✗"} {p.respuesta2}
                                      </p>
                                    </div>
                                    <div className={styles.detailBlock}>
                                      <span className={styles.detailLabel}>IP / Fecha</span>
                                      <p className={styles.detailText}>{p.ip_address ?? "—"} · {formatDate(p.created_at)}</p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })()}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Preguntas ── */}
      {activeTab === "preguntas" && (
        <div className={styles.setsSection}>
          <div className={styles.setsHeader}>
            <p className={styles.setsHint}>
              Configurá los sets de preguntas y los días en que se muestran en el formulario.
            </p>
            <button className={styles.newSetBtn} onClick={() => { setEditingSet(emptySetForm()); setSetsError(""); }}>
              + Nuevo set
            </button>
          </div>

          {/* Preguntas por defecto (fallback siempre visible) */}
          {(() => {
            const dbDefault = sets.find((s) => s.es_default);
            return (
              <div className={`${styles.setCard} ${styles.setCardDefault}`}>
                <div className={styles.setCardHeader}>
                  <div className={styles.setCardMeta}>
                    <span className={styles.setCardName}>Preguntas por defecto</span>
                    <span className={styles.setDefaultBadge}>Fallback — activo cuando no hay set para el día</span>
                  </div>
                  <div className={styles.setCardActions}>
                    {dbDefault ? (
                      <button className={styles.setEditBtn} onClick={() => { setEditingSet({ ...dbDefault }); setSetsError(""); }}>
                        Editar
                      </button>
                    ) : (
                      <button
                        className={styles.setEditBtn}
                        onClick={() => {
                          setEditingSet({
                            nombre: "Preguntas por defecto",
                            dias: [],
                            activo: true,
                            es_default: true,
                            p1_etiqueta: DEFAULT_P1_LABEL,
                            p1_pregunta: DEFAULT_P1_Q,
                            p1_youtube_url: "https://www.youtube.com/embed/4GrL1ccJ3mo",
                            p1_respuesta_correcta: CORRECT_R1,
                            p2_etiqueta: DEFAULT_P2_LABEL,
                            p2_pregunta: DEFAULT_P2_Q,
                            p2_youtube_url: "https://www.youtube.com/embed/__KGJ4_HmgY",
                            p2_respuesta_correcta: CORRECT_R2,
                          });
                          setSetsError("");
                        }}
                      >
                        Configurar
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.setCardQuestions}>
                  <div className={styles.setCardQ}>
                    <span className={styles.setCardQLabel}>P1</span>
                    <span className={styles.setCardQText}>{dbDefault?.p1_etiqueta ?? DEFAULT_P1_LABEL} — {dbDefault?.p1_pregunta ?? DEFAULT_P1_Q}</span>
                    <span className={styles.setCardQCorrect}>→ {dbDefault?.p1_respuesta_correcta ?? CORRECT_R1}</span>
                  </div>
                  <div className={styles.setCardQ}>
                    <span className={styles.setCardQLabel}>P2</span>
                    <span className={styles.setCardQText}>{dbDefault?.p2_etiqueta ?? DEFAULT_P2_LABEL} — {dbDefault?.p2_pregunta ?? DEFAULT_P2_Q}</span>
                    <span className={styles.setCardQCorrect}>→ {dbDefault?.p2_respuesta_correcta ?? CORRECT_R2}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Lista de sets configurados */}
          <div className={styles.setsList}>
            {sets.map((s) => (
              <div key={s.id} className={`${styles.setCard} ${!s.activo ? styles.setCardInactive : ""}`}>
                <div className={styles.setCardHeader}>
                  <div className={styles.setCardMeta}>
                    <span className={styles.setCardName}>{s.nombre}</span>
                    {s.activo
                      ? <span className={styles.setActiveBadge}>Activo</span>
                      : <span className={styles.setInactiveBadge}>Inactivo</span>}
                  </div>
                  <div className={styles.setCardActions}>
                    <button className={styles.setEditBtn} onClick={() => { setEditingSet({ ...s }); setSetsError(""); }}>Editar</button>
                    <button className={styles.setDeleteBtn} onClick={() => deleteSet(s.id)}>✕</button>
                  </div>
                </div>
                <div className={styles.setCardDays}>
                  {DIAS_LABELS.map((label, i) => (
                    <span key={i} className={`${styles.dayPill} ${s.dias?.includes(i) ? styles.dayPillActive : ""}`}>
                      {label}
                    </span>
                  ))}
                </div>
                <div className={styles.setCardQuestions}>
                  <div className={styles.setCardQ}>
                    <span className={styles.setCardQLabel}>P1</span>
                    <span className={styles.setCardQText}>{s.p1_etiqueta || "—"}</span>
                    <span className={styles.setCardQCorrect}>→ {s.p1_respuesta_correcta}</span>
                  </div>
                  <div className={styles.setCardQ}>
                    <span className={styles.setCardQLabel}>P2</span>
                    <span className={styles.setCardQText}>{s.p2_etiqueta || "—"}</span>
                    <span className={styles.setCardQCorrect}>→ {s.p2_respuesta_correcta}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Formulario de edición / creación */}
          {editingSet && (
            <div className={styles.setForm}>
              <h3 className={styles.setFormTitle}>{editingSet.id ? "Editar set" : "Nuevo set"}</h3>

              <div className={styles.setFormRow}>
                <div className={styles.setFormField}>
                  <label className={styles.setFormLabel}>Nombre del set</label>
                  <input
                    className={styles.setFormInput}
                    value={editingSet.nombre}
                    onChange={(e) => setEditingSet({ ...editingSet, nombre: e.target.value })}
                    placeholder="Ej: Set A"
                  />
                </div>
                <label className={styles.setFormCheckbox}>
                  <input
                    type="checkbox"
                    checked={editingSet.activo}
                    onChange={(e) => setEditingSet({ ...editingSet, activo: e.target.checked })}
                  />
                  Activo
                </label>
                <label className={styles.setFormCheckbox}>
                  <input
                    type="checkbox"
                    checked={editingSet.es_default ?? false}
                    onChange={(e) => setEditingSet({ ...editingSet, es_default: e.target.checked })}
                  />
                  Predeterminado
                </label>
              </div>

              <div className={styles.setFormField}>
                <label className={styles.setFormLabel}>Días activos</label>
                <div className={styles.daysRow}>
                  {DIAS_LABELS.map((label, i) => (
                    <label key={i} className={`${styles.dayCheckLabel} ${editingSet.dias?.includes(i) ? styles.dayCheckActive : ""}`}>
                      <input type="checkbox" checked={editingSet.dias?.includes(i) ?? false} onChange={() => toggleDay(i)} style={{ display: "none" }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Pregunta 1 */}
              <div className={styles.setFormSection}>
                <h4 className={styles.setFormSectionTitle}>Pregunta 1</h4>
                <div className={styles.setFormField}>
                  <label className={styles.setFormLabel}>Etiqueta / título del video</label>
                  <input className={styles.setFormInput} value={editingSet.p1_etiqueta ?? ""} onChange={(e) => setEditingSet({ ...editingSet, p1_etiqueta: e.target.value })} placeholder="Ej: Sesión #7 — Francisca y Los Exploradores" />
                </div>
                <div className={styles.setFormField}>
                  <label className={styles.setFormLabel}>URL del video de YouTube</label>
                  <input className={styles.setFormInput} value={editingSet.p1_youtube_url} onChange={(e) => setEditingSet({ ...editingSet, p1_youtube_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=... o embed URL" />
                </div>
                <div className={styles.setFormField}>
                  <label className={styles.setFormLabel}>Texto de la pregunta</label>
                  <textarea className={styles.setFormTextarea} value={editingSet.p1_pregunta} onChange={(e) => setEditingSet({ ...editingSet, p1_pregunta: e.target.value })} rows={3} placeholder="¿Cuántas veces...?" />
                </div>
                <div className={styles.setFormField}>
                  <label className={styles.setFormLabel}>Respuesta correcta (número)</label>
                  <input className={`${styles.setFormInput} ${styles.setFormInputSmall}`} value={editingSet.p1_respuesta_correcta} onChange={(e) => setEditingSet({ ...editingSet, p1_respuesta_correcta: e.target.value })} placeholder="3" />
                </div>
              </div>

              {/* Pregunta 2 */}
              <div className={styles.setFormSection}>
                <h4 className={styles.setFormSectionTitle}>Pregunta 2</h4>
                <div className={styles.setFormField}>
                  <label className={styles.setFormLabel}>Etiqueta / título del video</label>
                  <input className={styles.setFormInput} value={editingSet.p2_etiqueta ?? ""} onChange={(e) => setEditingSet({ ...editingSet, p2_etiqueta: e.target.value })} placeholder="Ej: Sesión #8 — Mariana Michi" />
                </div>
                <div className={styles.setFormField}>
                  <label className={styles.setFormLabel}>URL del video de YouTube</label>
                  <input className={styles.setFormInput} value={editingSet.p2_youtube_url} onChange={(e) => setEditingSet({ ...editingSet, p2_youtube_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=... o embed URL" />
                </div>
                <div className={styles.setFormField}>
                  <label className={styles.setFormLabel}>Texto de la pregunta</label>
                  <textarea className={styles.setFormTextarea} value={editingSet.p2_pregunta} onChange={(e) => setEditingSet({ ...editingSet, p2_pregunta: e.target.value })} rows={3} placeholder="¿Cuántos riffs...?" />
                </div>
                <div className={styles.setFormField}>
                  <label className={styles.setFormLabel}>Respuesta correcta (número)</label>
                  <input className={`${styles.setFormInput} ${styles.setFormInputSmall}`} value={editingSet.p2_respuesta_correcta} onChange={(e) => setEditingSet({ ...editingSet, p2_respuesta_correcta: e.target.value })} placeholder="6" />
                </div>
              </div>

              {setsError && <p className={styles.errorMsg}>{setsError}</p>}

              <div className={styles.setFormActions}>
                <button className={styles.setCancelBtn} onClick={() => { setEditingSet(null); setSetsError(""); }}>Cancelar</button>
                <button className={styles.setSaveBtn} onClick={saveSet} disabled={savingSet}>
                  {savingSet ? "Guardando..." : "Guardar set"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Calificación ── */}
      {activeTab === "calificacion" && (
        <div className={styles.scoreSection}>
          {(!data || data.length === 0) && <p className={styles.empty}>No hay postulaciones para calificar.</p>}
          {data && data.length > 0 && (() => {
            const sorted = [...data].sort((a, b) => (b.estrellas ?? -1) - (a.estrellas ?? -1));
            const scoreFields: Array<{ key: keyof Postulacion; label: string }> = [
              { key: "calidad_proyecto", label: "Calidad Proyecto" },
              { key: "calidad_artista", label: "Calidad Artista" },
              { key: "repertorio", label: "Repertorio" },
              { key: "presencia_camara", label: "Presencia Cámara" },
              { key: "compatibilidad", label: "Compatibilidad" },
            ];
            return (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Artista</th>
                      <th>★</th>
                      <th>Preguntas</th>
                      <th>Vio las sesiones</th>
                      {scoreFields.map((f) => <th key={f.key}>{f.label}</th>)}
                      <th>Total / 50</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((p) => {
                      const { r1, r2 } = getCorrectAnswers(p);
                      const r1ok = checkAnswer(p.respuesta1, r1);
                      const r2ok = checkAnswer(p.respuesta2, r2);
                      const correctCount = [r1ok, r2ok].filter(Boolean).length;
                      const scores = [p.calidad_proyecto, p.calidad_artista, p.repertorio, p.presencia_camara, p.compatibilidad];
                      const filledScores = scores.filter((s) => s != null) as number[];
                      const total = filledScores.reduce((acc, s) => acc + s, 0);
                      const allFilled = filledScores.length === 5;
                      const isCandidate = allFilled && total >= 35;
                      return (
                        <tr key={p.id} className={`${styles.row} ${isCandidate ? styles.rowCandidate : ""}`}>
                          <td className={styles.artistCell}>{p.artista}</td>
                          <td className={styles.starsDisplayCell}>
                            {p.estrellas != null
                              ? <span className={styles.starsText}>{"★".repeat(p.estrellas)}{"☆".repeat(5 - p.estrellas)}</span>
                              : <span className={styles.noScore}>—</span>}
                          </td>
                          <td className={styles.answerNumCell}>
                            <span className={correctCount === 2 ? styles.numOk : styles.numWrong}>
                              {correctCount}/2
                            </span>
                          </td>
                          <td>
                            {(() => {
                              const w1 = watchedSession(p.respuesta1, r1);
                              const w2 = watchedSession(p.respuesta2, r2);
                              const count = [w1, w2].filter(Boolean).length;
                              const cls = count === 2 ? styles.aclaroBtnYes : count === 0 ? styles.aclaroBtnNo : styles.aclaroBtnHalf;
                              return <span className={`${styles.aclaroChip} ${cls}`}>{count}/2</span>;
                            })()}
                          </td>
                          {scoreFields.map((f) => (
                            <td key={f.key} className={styles.scoreCell}>
                              <select
                                className={styles.scoreSelect}
                                value={(p[f.key] as number | null) ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                  patchScore(p.id, { [f.key]: val });
                                }}
                              >
                                <option value="">—</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </td>
                          ))}
                          <td className={styles.totalCell}>
                            {filledScores.length > 0 ? (
                              <span className={isCandidate ? styles.totalCandidate : allFilled ? styles.totalComplete : styles.totalPartial}>
                                {total}{allFilled ? "/50" : `/${filledScores.length * 10}`}
                                {isCandidate && <span className={styles.candidateBadge}>✓ Candidato</span>}
                              </span>
                            ) : <span className={styles.noScore}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Estadísticas ── */}
      {activeTab === "estadisticas" && (
        <div className={styles.statsSection}>
          <div className={styles.ytStatsSection}>
            <h3 className={styles.ytStatsTitle}>Sesiones EN .REC — Views en YouTube</h3>
            {ytLoading && <p className={styles.loading}>Cargando datos de YouTube...</p>}
            {ytStats && (() => {
              const hasError = ytStats.some((s) => (s as { error?: string }).error);
              if (hasError) return (
                <p className={styles.loading} style={{ color: "rgba(225,82,56,0.8)" }}>
                  Error al cargar datos de YouTube. Verificá la API key o revisá los logs del backend.
                </p>
              );
              const sorted = [...ytStats].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
              const totalViews = sorted.reduce((acc, s) => acc + (s.viewCount ?? 0), 0);
              const maxViews = Math.max(1, sorted[0]?.viewCount ?? 0);
              return (
                <>
                  <p className={styles.ytTotalViews}>
                    Total acumulado: <strong>{totalViews.toLocaleString("es-AR")}</strong> reproducciones
                  </p>

                  {/* Gráfico de barras */}
                  <div className={styles.chartWrap}>
                    {sorted.map((s) => {
                      const pct = maxViews > 0 ? Math.max(2, (s.viewCount / maxViews) * 100) : 2;
                      return (
                        <div key={s.videoId} className={styles.barRow}>
                          <span className={styles.barName}>{s.nombre}</span>
                          <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={styles.barValue}>{(s.viewCount ?? 0).toLocaleString("es-AR")}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Baseline controls */}
                  <div className={styles.baselineRow}>
                    {baselineDate ? (
                      <span className={styles.baselineInfo}>
                        Baseline: {new Date(baselineDate).toLocaleString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : (
                      <span className={styles.baselineInfo}>Sin baseline — fijá uno para medir el impacto de la campaña.</span>
                    )}
                    <button
                      className={styles.baselineBtn}
                      onClick={captureBaseline}
                      disabled={capturingBaseline}
                    >
                      {capturingBaseline ? "Guardando…" : "Fijar baseline ahora"}
                    </button>
                  </div>

                  {/* Tabla */}
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Artista</th>
                          <th style={{ textAlign: "right" }}>Views</th>
                          <th style={{ textAlign: "right" }}>+Views</th>
                          <th style={{ textAlign: "right" }}>👍 Likes</th>
                          <th style={{ textAlign: "right" }}>+Likes</th>
                          <th>Publicado</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((s) => (
                          <tr key={s.videoId} className={styles.row}>
                            <td className={styles.artistCell}>{s.nombre}</td>
                            <td style={{ textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{(s.viewCount ?? 0).toLocaleString("es-AR")}</td>
                            <td style={{ textAlign: "right" }} className={styles.deltaCell}>
                              {s.deltaViews != null ? (s.deltaViews >= 0 ? "+" : "") + s.deltaViews.toLocaleString("es-AR") : "—"}
                            </td>
                            <td style={{ textAlign: "right" }}>{(s.likeCount ?? 0).toLocaleString("es-AR")}</td>
                            <td style={{ textAlign: "right" }} className={styles.deltaCell}>
                              {s.deltaLikes != null ? (s.deltaLikes >= 0 ? "+" : "") + s.deltaLikes.toLocaleString("es-AR") : "—"}
                            </td>
                            <td className={styles.dateCell}>{s.publishedAt ? new Date(s.publishedAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                            <td><a href={`https://www.youtube.com/watch?v=${s.videoId}`} target="_blank" rel="noopener noreferrer" className={styles.link}>YT ↗</a></td>
                          </tr>
                        ))}
                        <tr className={styles.row} style={{ borderTop: "2px solid var(--border)" }}>
                          <td className={styles.artistCell}>TOTAL</td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{totalViews.toLocaleString("es-AR")}</td>
                          <td style={{ textAlign: "right" }} className={styles.deltaCell}>
                            {sorted.some(s => s.deltaViews != null)
                              ? "+" + sorted.reduce((acc, s) => acc + (s.deltaViews ?? 0), 0).toLocaleString("es-AR")
                              : "—"}
                          </td>
                          <td colSpan={4}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
