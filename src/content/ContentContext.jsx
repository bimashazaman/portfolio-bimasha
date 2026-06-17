import { createContext, useContext, useEffect, useState } from "react";
import { defaults } from "../data/content";

/* ============================================================
   Dynamic content layer.
   ------------------------------------------------------------
   The site's copy now lives in a database, served as JSON by the
   PHP API at `${VITE_API_BASE}/content.php`. This provider fetches
   it once on mount and exposes it through `useContent()`.

   The "never break" guarantee:
   - The context's DEFAULT value is the bundled `defaults` from
     content.js, so components render correct content on the very
     first paint — before the fetch resolves, and forever if it
     never does.
   - Fetched sections are merged OVER the bundled ones per top-level
     key, so a partial/socket-flaky response can only ADD known-good
     data, never blank a section.
   - Any error (network, non-2xx, ok:false, malformed JSON) is
     swallowed and we keep the bundled content. The site cannot go
     blank because the API had a bad day.
   ============================================================ */

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const ContentContext = createContext(defaults);

/** Shallow-merge fetched sections over the bundled defaults (per section). */
function mergeContent(fetched) {
  if (!fetched || typeof fetched !== "object") return defaults;
  const merged = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (fetched[key] != null) merged[key] = fetched[key];
  }
  return merged;
}

export function ContentProvider({ children }) {
  // Start with bundled content → correct first paint, no spinner, no flash gap.
  const [content, setContent] = useState(defaults);

  useEffect(() => {
    const controller = new AbortController();
    // Don't hang forever on a stalled connection — fall back fast.
    const timeout = setTimeout(() => controller.abort(), 6000);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/content.php`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return; // keep defaults
        const body = await res.json();
        if (body && body.ok && body.data) {
          setContent(mergeContent(body.data));
        }
      } catch {
        // Network/abort/parse error → silently keep bundled defaults.
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <ContentContext.Provider value={content}>
      {children}
    </ContentContext.Provider>
  );
}

/**
 * Read the live (or fallback) content. Returns the whole content object;
 * destructure the section(s) you need, e.g. `const { hero } = useContent()`.
 */
export function useContent() {
  return useContext(ContentContext);
}
