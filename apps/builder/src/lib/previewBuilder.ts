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

// Removes import/export statements from App.jsx so it can run as a plain
// <script type="text/babel"> in the preview shell -- React and its hooks are
// provided as pre-destructured globals instead (see buildReactPreviewDocument).
function stripModuleSyntax(code: string): string {
  return code
    .replace(/^\s*import\s+.*?;\s*$/gm, "")
    .replace(/^\s*export\s+default\s+App;?\s*$/gm, "")
    .replace(/export\s+default\s+/g, "");
}

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
<script>${escapeScriptClose(reactSource)}</script>
<script>${escapeScriptClose(reactDomSource)}</script>
<script>${escapeScriptClose(babelSource)}</script>
${stack === "react-supabase" ? `<script>${MOCK_SUPABASE_CLIENT_SOURCE}</script>` : ""}`;
}

// Builds the document loaded into the preview iframe. Static-html apps are
// rendered as-is; React apps are stitched into a single Babel-standalone
// page so hooks and JSX run for real without needing an actual bundler.
export function buildPreviewDocument(files: GeneratedFile[], stack: Stack): string {
  if (stack === "static-html") {
    const html = findFile(files, "index.html");
    return html?.content ?? "<p>No index.html was generated.</p>";
  }

  const appFile = findFile(files, "App.jsx");
  const cssFile = findFile(files, "index.css");
  if (!appFile) {
    return "<p style='font-family:sans-serif;padding:2rem'>No src/App.jsx was generated.</p>";
  }

  const appCode = stripModuleSyntax(appFile.content);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  ${reactPreviewHead(cssFile?.content ?? "", stack)}
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } = React;

    ${appCode}

    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<App />);
  </script>
</body>
</html>`;
}
