import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent scroll from changing number input values globally
document.addEventListener("wheel", (e) => {
  const el = document.activeElement;
  if (el && el instanceof HTMLInputElement && el.type === "number") {
    el.blur();
  }
}, { passive: true });

createRoot(document.getElementById("root")!).render(<App />);
