// Relative paths (rather than bare specifiers) bypass react/react-dom's
// package.json "exports" map, which otherwise blocks deep-importing the UMD
// builds needed to inline these libraries into the preview iframe.
import reactSource from "../../../../node_modules/react/umd/react.development.js?raw";
import reactDomSource from "../../../../node_modules/react-dom/umd/react-dom.development.js?raw";
import babelSource from "@babel/standalone/babel.min.js?raw";
import type { GeneratedFile, Stack } from "./types";

// Libraries are bundled from node_modules and inlined directly into the
// preview document (rather than loaded from a CDN) so the live preview
// works even when the browser has no outbound network access, and never
// depends on a third party being reachable.
function escapeScriptClose(source: string): string {
  return source.replace(/<\/script/gi, "<\\/script");
}

function findFile(files: GeneratedFile[], suffix: string): GeneratedFile | undefined {
  return files.find((f) => f.path === suffix || f.path.endsWith(`/${suffix}`));
}

// Claude is instructed to name the entry point "src/App.jsx", but doesn't
// always follow that exactly -- try the common variants, in order of
// preference, before giving up. "index.html" is the last resort: if nothing
// resembling a React entry point turned up, at least render whatever HTML
// was generated instead of a dead end.
const REACT_ENTRY_CANDIDATES = ["src/App.jsx", "App.jsx", "app.jsx", "src/App.tsx", "App.tsx", "index.jsx", "index.html"];

function findEntryFile(files: GeneratedFile[]): GeneratedFile | undefined {
  for (const candidate of REACT_ENTRY_CANDIDATES) {
    const match = files.find(
      (f) =>
        f.path === candidate ||
        f.path.endsWith(`/${candidate}`) ||
        f.path.toLowerCase() === candidate.toLowerCase()
    );
    if (match) return match;
  }
  return undefined;
}

// Removes import/export statements from App.jsx so it can run as a plain
// <script type="text/babel"> in the preview shell -- React and its hooks are
// provided as pre-destructured globals instead (see buildReactPreviewDocument).
function stripModuleSyntax(code: string): string {
  return code
    .replace(/^\s*import\s+.*?;\s*$/gm, "")
    .replace(/^\s*export\s+default\s+App;?\s*$/gm, "")
    .replace(/export\s+default\s+/g, "");
}

// The preview iframe is sandboxed without `allow-same-origin`, which makes
// the real `window.localStorage` accessor throw a SecurityError on first
// touch instead of just being absent -- generated apps that use localStorage
// for persistence would otherwise crash the whole preview on load. A `const
// localStorage = {...}` declared in its own top-level script shadows the
// global identifier for every script that runs after it (App.jsx included),
// without ever touching the real `window.localStorage` property that throws.
const MOCK_LOCAL_STORAGE_SOURCE = `
const _storage = {};
const localStorage = {
  getItem: (k) => _storage[k] ?? null,
  setItem: (k, v) => { _storage[k] = String(v); },
  removeItem: (k) => { delete _storage[k]; },
  clear: () => { Object.keys(_storage).forEach(k => delete _storage[k]); },
  key: (i) => Object.keys(_storage)[i] ?? null,
  get length() { return Object.keys(_storage).length; }
};
`;

// A minimal in-memory mock of the supabase-js client surface, so
// react-supabase previews are fully interactive without ever touching the
// platform's real Supabase project. Data resets whenever the preview reloads.
const MOCK_SUPABASE_CLIENT_SOURCE = `
window.supabase = (function () {
  var tables = {};
  var currentUser = null;
  var authListeners = [];

  function rows(name) {
    if (!tables[name]) tables[name] = [];
    return tables[name];
  }
  function applyFilters(list, filters) {
    return list.filter(function (row) {
      return filters.every(function (f) { return row[f[0]] === f[1]; });
    });
  }
  function notifyAuth(event) {
    authListeners.forEach(function (cb) { cb(event, currentUser ? { user: currentUser } : null); });
  }
  function queryBuilder(name) {
    var filters = [];
    var builder = {
      select: function () { return Promise.resolve({ data: applyFilters(rows(name), filters), error: null }); },
      insert: function (payload) {
        var items = Array.isArray(payload) ? payload : [payload];
        var withIds = items.map(function (item) {
          return Object.assign({ id: "mock-" + Math.random().toString(36).slice(2) }, item);
        });
        rows(name).push.apply(rows(name), withIds);
        return Promise.resolve({ data: withIds, error: null });
      },
      update: function (payload) {
        var matched = applyFilters(rows(name), filters);
        matched.forEach(function (row) { Object.assign(row, payload); });
        return Promise.resolve({ data: matched, error: null });
      },
      delete: function () {
        var matched = applyFilters(rows(name), filters);
        matched.forEach(function (row) {
          var idx = rows(name).indexOf(row);
          if (idx > -1) rows(name).splice(idx, 1);
        });
        return Promise.resolve({ data: matched, error: null });
      },
      eq: function (col, val) { filters.push([col, val]); return builder; },
      order: function () { return builder; },
      limit: function () { return builder; },
      single: function () {
        var match = applyFilters(rows(name), filters)[0] || null;
        return Promise.resolve({ data: match, error: null });
      },
      maybeSingle: function () {
        var match = applyFilters(rows(name), filters)[0] || null;
        return Promise.resolve({ data: match, error: null });
      },
      then: function (resolve, reject) {
        return this.select().then(resolve, reject);
      },
    };
    return builder;
  }

  return {
    auth: {
      signUp: function (creds) {
        currentUser = { id: "mock-" + Date.now(), email: creds.email };
        notifyAuth("SIGNED_IN");
        return Promise.resolve({ data: { user: currentUser, session: { user: currentUser } }, error: null });
      },
      signInWithPassword: function (creds) {
        currentUser = { id: "mock-" + Date.now(), email: creds.email };
        notifyAuth("SIGNED_IN");
        return Promise.resolve({ data: { user: currentUser, session: { user: currentUser } }, error: null });
      },
      signOut: function () {
        currentUser = null;
        notifyAuth("SIGNED_OUT");
        return Promise.resolve({ error: null });
      },
      getUser: function () { return Promise.resolve({ data: { user: currentUser }, error: null }); },
      getSession: function () { return Promise.resolve({ data: { session: currentUser ? { user: currentUser } : null }, error: null }); },
      onAuthStateChange: function (cb) {
        authListeners.push(cb);
        return { data: { subscription: { unsubscribe: function () {} } } };
      },
    },
    from: queryBuilder,
  };
})();
`;

function reactPreviewHead(css: string, stack: Stack): string {
  return `<style>${css}</style>
<script>${MOCK_LOCAL_STORAGE_SOURCE}</script>
<script>${escapeScriptClose(reactSource)}</script>
<script>${escapeScriptClose(reactDomSource)}</script>
<script>${escapeScriptClose(babelSource)}</script>
${stack === "react-supabase" ? `<script>${MOCK_SUPABASE_CLIENT_SOURCE}</script>` : ""}`;
}

// Builds the document loaded into the preview iframe. Static-html apps are
// rendered as-is; React apps are stitched into a single Babel-standalone
// page so hooks and JSX run for real without needing an actual bundler.
export function buildPreviewDocument(files: GeneratedFile[], stack: Stack): string {
  const paths = files.map((f) => f.path);
  console.log("[previewBuilder] parsed files from generation output:", paths);

  if (stack === "static-html") {
    const html = findFile(files, "index.html");
    if (!html) console.warn("[previewBuilder] no index.html found among parsed files:", paths);
    return html?.content ?? "<p>No index.html was generated.</p>";
  }

  const appFile = findEntryFile(files);
  if (!appFile) {
    console.warn("[previewBuilder] no recognizable entry point found among parsed files:", paths);
    return `<p style="font-family:sans-serif;padding:2rem">No entry point (src/App.jsx, App.jsx, or index.html) was generated.<br />Files received: ${
      paths.join(", ") || "(none)"
    }</p>`;
  }
  console.log(`[previewBuilder] using "${appFile.path}" as the entry point`);

  // Last-resort fallback: nothing resembling a React component was found,
  // only a raw HTML file -- render it directly instead of feeding HTML
  // through the JSX/Babel pipeline.
  if (appFile.path.toLowerCase().endsWith(".html")) {
    return appFile.content;
  }

  const cssFile = findFile(files, "index.css");
  const appCode = stripModuleSyntax(appFile.content);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  ${reactPreviewHead(cssFile?.content ?? "", stack)}
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react,typescript">
    const { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } = React;

    ${appCode}

    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<App />);
  </script>
</body>
</html>`;
}
