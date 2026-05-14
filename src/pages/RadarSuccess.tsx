import { useEffect } from "react";
import styles from "./Radar.module.css";
import { gtmPush, gtagConversion } from "../gtm";

export default function RadarSuccess() {
  useEffect(() => {
    gtmPush({ event: "radar_form_submit" });
    gtagConversion("dOR3CLfu4qwcEP6vibc_");
  }, []);

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
