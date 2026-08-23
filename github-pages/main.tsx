import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ArchiveApp from "../app/archive-client";
import "../app/globals.css";
import "../app/admin.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ArchiveApp initialPath={window.location.pathname} />
  </StrictMode>,
);
