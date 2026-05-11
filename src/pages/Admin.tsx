import { useState, useEffect } from "react";
import styles from "./Admin.module.css";

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
  ip_address: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportCSV(data: Postulacion[]) {
  const headers = [
    "ID","Artista","Email","Género","Spotify","YouTube","Instagram",
    "Descripción","Pregunta 1","Pregunta 2","IP","Fecha",
  ];
  const rows = data.map((p) => [
    p.id, p.artista, p.email, p.genero, p.spotify ?? "",
    p.youtube, p.instagram,
    `"${p.descripcion.replace(/"/g, '""')}"`,
    `"${p.respuesta1.replace(/"/g, '""')}"`,
    `"${p.respuesta2.replace(/"/g, '""')}"`,
    p.ip_address ?? "", formatDate(p.created_at),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `radar-enrec-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") ?? "");
  const [input, setInput] = useState("");
  const [data, setData] = useState<Postulacion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchData = async (t: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/radar/admin/postulaciones", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) {
        setError("Token incorrecto.");
        setToken("");
        sessionStorage.removeItem("admin_token");
        setData(null);
        return;
      }
      if (!res.ok) throw new Error("Error del servidor");
      const json = await res.json();
      setData(json);
    } catch {
      setError("No se pudo conectar con el servidor.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData(token);
  }, [token]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sessionStorage.setItem("admin_token", input.trim());
    setToken(input.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setToken("");
    setData(null);
    setInput("");
  };

  // ── Login screen ──
  if (!token) {
    return (
      <div className={styles.loginScreen}>
        <form onSubmit={handleLogin} className={styles.loginCard}>
          <h1 className={styles.loginTitle}>Admin EN .REC</h1>
          <p className={styles.loginSub}>Radar — Postulaciones</p>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Token de acceso"
            className={styles.loginInput}
            autoFocus
          />
          {error && <p className={styles.loginError}>{error}</p>}
          <button type="submit" className={styles.loginBtn}>
            Ingresar
          </button>
        </form>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1 className={styles.pageTitle}>Radar EN .REC</h1>
          {data && (
            <span className={styles.badge}>{data.length} postulación{data.length !== 1 ? "es" : ""}</span>
          )}
        </div>
        <div className={styles.topBarRight}>
          {data && data.length > 0 && (
            <button className={styles.exportBtn} onClick={() => exportCSV(data)}>
              Exportar CSV
            </button>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Salir
          </button>
        </div>
      </div>

      {loading && <p className={styles.loading}>Cargando...</p>}
      {error && <p className={styles.errorMsg}>{error}</p>}

      {data && data.length === 0 && (
        <p className={styles.empty}>Todavía no hay postulaciones.</p>
      )}

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
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <>
                  <tr
                    key={p.id}
                    className={`${styles.row} ${expanded === p.id ? styles.rowActive : ""}`}
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
                      <a href={p.instagram} target="_blank" rel="noopener noreferrer" className={styles.link} onClick={(e) => e.stopPropagation()}>
                        IG ↗
                      </a>
                    </td>
                    <td>
                      <a href={p.youtube} target="_blank" rel="noopener noreferrer" className={styles.link} onClick={(e) => e.stopPropagation()}>
                        YT ↗
                      </a>
                    </td>
                    <td className={styles.dateCell}>{formatDate(p.created_at)}</td>
                    <td className={styles.chevron}>{expanded === p.id ? "▲" : "▼"}</td>
                  </tr>

                  {expanded === p.id && (
                    <tr key={`${p.id}-detail`} className={styles.detailRow}>
                      <td colSpan={8}>
                        <div className={styles.detail}>
                          <div className={styles.detailGrid}>
                            <div className={styles.detailBlock}>
                              <span className={styles.detailLabel}>Descripción del proyecto</span>
                              <p className={styles.detailText}>{p.descripcion}</p>
                            </div>
                            <div className={styles.detailBlock}>
                              <span className={styles.detailLabel}>Spotify</span>
                              <p className={styles.detailText}>
                                {p.spotify
                                  ? <a href={p.spotify} target="_blank" rel="noopener noreferrer" className={styles.link}>{p.spotify}</a>
                                  : "—"}
                              </p>
                            </div>
                            <div className={styles.detailBlock}>
                              <span className={styles.detailLabel}>
                                Pregunta 1 — ¿Cuántas veces aparecen los camarógrafos?
                              </span>
                              <p className={styles.detailText}>{p.respuesta1}</p>
                            </div>
                            <div className={styles.detailBlock}>
                              <span className={styles.detailLabel}>
                                Pregunta 2 — ¿Cuántos solos de guitarra?
                              </span>
                              <p className={styles.detailText}>{p.respuesta2}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
