import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { AuthProvider } from "@createwithskai/auth";
import App from "./App";
import "./index.css";

// TEMPORARY diagnostics -- remove once Sentry is confirmed reaching
// production. By default Sentry.init() prints nothing at all on success, so
// "no console output" is not itself evidence of a problem; these two lines
// are what actually distinguish "the DSN never reached the bundle" (a Vercel
// env var scoping/redeploy issue) from "it initialized fine, just silently."
console.log("Sentry DSN:", import.meta.env.VITE_SENTRY_DSN ? "present" : "missing");

// VITE_SENTRY_DSN is left as an empty placeholder until a real project DSN
// is configured -- Sentry.init() with a falsy dsn safely disables the SDK
// rather than throwing, so this is a no-op until then.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  debug: true, // TEMPORARY -- makes the SDK log its own init/send activity to console
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
      <AuthProvider>
        <App />
      </AuthProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
