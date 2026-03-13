import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles.css";

const VITE_PRELOAD_RELOAD_KEY = "austria-ev-tco.preload-reload";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  if (sessionStorage.getItem(VITE_PRELOAD_RELOAD_KEY) === "1") {
    sessionStorage.removeItem(VITE_PRELOAD_RELOAD_KEY);
    return;
  }
  sessionStorage.setItem(VITE_PRELOAD_RELOAD_KEY, "1");
  window.location.reload();
});

if (sessionStorage.getItem(VITE_PRELOAD_RELOAD_KEY) === "1") {
  sessionStorage.removeItem(VITE_PRELOAD_RELOAD_KEY);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
