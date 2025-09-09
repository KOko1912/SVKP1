// frontend/src/pages/Vendedor/Disenos/DisenoEstiloAccesoriosAuto.jsx
import React from "react";
import TemplateBase from "./TemplateBase";

export default function DisenoEstiloAccesoriosAuto(props) {
  const theme = {
    name: "auto",
    bg: "#06080d",
    surface: "rgba(255,255,255,0.05)",
    text: "#e6f0ff",
    sub: "#c9d7ef",
    accent: "#00e5ff", // cian racing
    fontFamily: "'Rajdhani', ui-sans-serif, system-ui, sans-serif",
    heroFallback: "Performance, detailing y accesorios premium.",
    card: { objectFit: "cover", bannerPos: "center 60%" },
    bannerMinH: "260px",
    heroOverlay: "radial-gradient(60% 60% at 50% 40%, rgba(0,229,255,.2), transparent)"
  };
  return <TemplateBase {...props} theme={theme} />;
}
