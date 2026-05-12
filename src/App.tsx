import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Radar from "./pages/Radar";
import Admin from "./pages/Admin";
import { gtmPush } from "./gtm";

function getSessionId(): string {
  const key = "enrec_sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

export default function App() {
  const location = useLocation();

  useEffect(() => {
    gtmPush({ event: "page_view", page_path: location.pathname });
    fetch("/api/radar/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: location.pathname, sid: getSessionId() }),
    }).catch(() => {});
  }, [location.pathname]);

  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/radar" element={<Radar />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </>
  );
}
