import { useState, useEffect } from "react";
import styles from "./Playlist.module.css";

const PLAYLIST_ID = "PLqJk9GdEsmDPELDu8h4MbMfJ1nBr2gPFo";
const FIRST_VIDEO_ID = "4GrL1ccJ3mo";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function Playlist() {
  const [muted, setMuted] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [player, setPlayer] = useState<any>(null);

  useEffect(() => {
    function initPlayer() {
      const p = new window.YT.Player("yt-playlist-player", {
        width: "100%",
        height: "100%",
        videoId: FIRST_VIDEO_ID,
        playerVars: {
          list: PLAYLIST_ID,
          listType: "playlist",
          autoplay: 1,
          mute: 1,
          rel: 0,
          modestbranding: 1,
        },
      });
      setPlayer(p);
    }

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    }
  }, []);

  function activateSound() {
    if (player?.unMute) {
      player.unMute();
      player.setVolume(100);
    }
    setMuted(false);
  }

  return (
    <div className={styles.container}>
      <div id="yt-playlist-player" className={styles.player} />
      {muted && (
        <button className={styles.soundOverlay} onClick={activateSound}>
          <span className={styles.soundIcon}>🔊</span>
          <span className={styles.soundText}>Activar sonido</span>
        </button>
      )}
    </div>
  );
}
