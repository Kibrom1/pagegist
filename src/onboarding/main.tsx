import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Onboarding } from "./Onboarding";

const root = document.getElementById("root");
if (!root) throw new Error("[PageGist] #root missing");
createRoot(root).render(
  <StrictMode>
    <Onboarding />
  </StrictMode>,
);
