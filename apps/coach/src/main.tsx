import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "@createwithskai/auth";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
