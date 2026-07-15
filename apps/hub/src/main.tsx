import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { AuthProvider } from "@createwithskai/auth";
import App from "./App";
import "./index.css";

// VITE_SENTRY_DSN is left as an empty placeholder until a real project DSN
// is configured -- Sentry.init() with a falsy dsn safely disables the SDK
// rather than throwing, so this is a no-op until then.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});

function ErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6 text-center">
      <div>
        <h1 className="mb-2 text-xl font-semibold text-espresso">Something went wrong.</h1>
        <p className="text-sm text-espresso/70">Please refresh the page. The error has been reported.</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
