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
  const [activeTab, setActiveTab] = useState<"postulaciones" | "preguntas">("postulaciones");
  const [editingSet, setEditingSet] = useState<SetForm | null>(null);
  const [savingSet, setSavingSet] = useState(false);
  const [setsError, setSetsError] = useState("");

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

  useEffect(() => {
    if (token) { fetchData(token); fetchSets(token); }
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
                              <td colSpan={12}>
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
    </div>
  );
}
