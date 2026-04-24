import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Registro del Service Worker SOLO fuera del editor (iframe / preview)
// para evitar cachés stale durante el desarrollo.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const isPreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("lovable.app"));

if (isInIframe || isPreviewHost) {
  // Limpia cualquier SW previamente registrado en preview/iframe.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
} else if ("serviceWorker" in navigator && import.meta.env.PROD) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* silencio: el plugin PWA inyecta este módulo en build */
    });
}

createRoot(document.getElementById("root")!).render(<App />);
