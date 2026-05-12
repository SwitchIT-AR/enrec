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
