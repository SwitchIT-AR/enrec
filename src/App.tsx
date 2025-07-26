import "./App.css";
import "@mantine/core/styles.css";
import { Grid, Modal } from "@mantine/core";
import { useState } from "react";

import francisca from "./assets/francisca.jpg";
import francisca1 from "./assets/francisca1.jpg";
import jjulian from "./assets/jjjulian.jpg";
import logo from "./assets/logo-enrec.png";
import luaso from "./assets/luaso.jpg";
import luasogral from "./assets/luasogral.jpg";
import martu from "./assets/martu.jpg";
import mina from "./assets/mina.jpg";
import motel from "./assets/motel.jpg";
import palmitos from "./assets/palmitos.jpg";

function App() {
  const [opened, setOpened] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  const images = [
    { src: francisca, url: "" },
    { src: motel, url: "https://www.youtube.com/embed/nTQM4gD68Yo" },
    { src: martu, url: "https://www.youtube.com/embed/BZivQ-XM7tI" },
    { src: luaso, url: "https://www.youtube.com/embed/yEq3rOBf0SM" },
    { src: luasogral, url: "", isCenter: true },
    { src: francisca1, url: "" },
    { src: mina, url: "https://www.youtube.com/embed/kLsmlObEMUk" },
    { src: jjulian, url: "https://www.youtube.com/embed/jngaRABfN50" },
    { src: palmitos, url: "https://www.youtube.com/embed/qXqajLd4YHI" },
  ];

  const handleClick = (item: { url: string; isCenter?: boolean }) => {
    if (!item.url || item.isCenter) return;
    setVideoUrl(item.url);
    setOpened(true);
  };

  return (
    <div className="grid-container">
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        centered
        size="auto"
        withinPortal={false}
        withCloseButton
        overlayProps={{
          backgroundOpacity: 0.85,
          blur: 4,
        }}
        styles={{
          content: {
            zIndex: 9999,
            backgroundColor: "transparent",
            boxShadow: "none",
            padding: 0,
          },
        }}
      >
        <div
          style={{
            position: "relative",
            width: "90vw",
            maxWidth: "1280px",
            aspectRatio: "16 / 9",
          }}
        >
          <iframe
            src={videoUrl}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        </div>
      </Modal>

      <Grid gutter={0}>
        {images.map((item, idx) => (
          <Grid.Col span={{ base: 6, sm: 6, md: 4 }} key={idx}>
            <div
              onClick={() => handleClick(item)}
              className="image-wrapper"
              style={{ cursor: item.url ? "pointer" : "default" }}
            >
              <img
                src={item.src}
                className={`grid-image ${item.isCenter ? "no-hover" : ""}`}
                alt={`img-${idx}`}
              />
              <div className="overlay" />
              {item.isCenter && (
                <img src={logo} className="logo-overlay no-filter" alt="logo" />
              )}
            </div>
          </Grid.Col>
        ))}
      </Grid>
    </div>
  );
}

export default App;
