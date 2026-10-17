// import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/reset.css";
import App from "./app/App.jsx";
import "./styles/portal.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
