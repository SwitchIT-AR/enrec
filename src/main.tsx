import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "./index.css";
import App from "./App.tsx";

const theme = createTheme({
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  primaryColor: "red",
  colors: {
    red: [
      "#fff0f0",
      "#ffdede",
      "#ffbbbb",
      "#ff9494",
      "#ff6b6b",
      "#ff4444",
      "#ff3333",
      "#e62a2a",
      "#cc2020",
      "#b31515",
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
