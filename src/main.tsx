import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "./index.css";
import App from "./App.tsx";

const GTAG_ID = import.meta.env.VITE_GTAG_ID;
if (GTAG_ID && !GTAG_ID.startsWith("AW-XXX")) {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`;
  document.head.appendChild(script);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).dataLayer = (window as any).dataLayer || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).gtag = function (...args: any[]) { (window as any).dataLayer.push(args); };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).gtag("js", new Date());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).gtag("config", GTAG_ID);
}

const theme = createTheme({
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  primaryColor: "red",
  colors: {
    red: [
      "#fef0ee",
      "#fdddd9",
      "#f9b9b1",
      "#f59285",
      "#f16e5e",
      "#E15238",
      "#c94530",
      "#b03a27",
      "#973020",
      "#7e2618",
    ],
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <App />
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>
);
