import { useEffect, useMemo, useRef, useState } from "react";
import { useContent } from "../content/ContentContext";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

// `k` holds extra keywords for the filter. Built from live content so the
// profile links stay in sync with whatever's in the CMS.
const buildCommands = (meta) => [
  {
    id: "contact",
    label: "Start a project — go to contact",
    hint: "Hire",
    k: "hire email form message project start talk",
    type: "nav",
    hash: "#contact",
  },
  {
    id: "copy-email",
    label: "Copy email address",
    hint: "Hire",
    k: "copy email clipboard",
    type: "copy",
  },
  {
    id: "work",
    label: "Selected work",
    hint: "Go to",
    k: "cases projects portfolio bizam life coach hub",
    type: "nav",
    hash: "#work",
  },
  {
    id: "about",
    label: "About me",
    hint: "Go to",
    k: "bio who bimasha",
    type: "nav",
    hash: "#about",
  },
  {
    id: "stack",
    label: "Stack & tools",
    hint: "Go to",
    k: "skills tech laravel react node ai",
    type: "nav",
    hash: "#stack",
  },
  {
    id: "journey",
    label: "Journey",
    hint: "Go to",
    k: "timeline career history experience",
    type: "nav",
    hash: "#journey",
  },
  {
    id: "faq",
    label: "Real talk (FAQ)",
    hint: "Go to",
    k: "questions answers faq honest",
    type: "nav",
    hash: "#faq",
  },
  {
    id: "bizam",
    label: "Open Bizam — live product",
    hint: "Visit",
    k: "live demo product networking",
    type: "href",
    href: "https://bizam.net",
    ext: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    hint: "Visit",
    k: "social profile connect",
    type: "href",
    href: meta.linkedin,
    ext: true,
  },
  {
    id: "github",
    label: "GitHub",
    hint: "Visit",
    k: "code repos source",
    type: "href",
    href: meta.github,
    ext: true,
  },
  {
    id: "theme",
    label: "Toggle light / dark theme",
    hint: "Theme",
    k: "dark light mode color switch",
    type: "theme",
  },
];

/**
 * ⌘K / Ctrl+K command palette: jump to sections, copy the email,
 * open profiles, or flip the theme — all from the keyboard.
 * Also opened by the nav chip via the "open-cmdk" window event.
 */
export function CommandMenu() {
  const { meta } = useContent();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const returnFocus = useRef(null);

  const COMMANDS = useMemo(() => buildCommands(meta), [meta]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) =>
      `${c.label} ${c.k}`.toLowerCase().includes(q)
    );
  }, [query, COMMANDS]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-cmdk", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-cmdk", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement;
      setQuery("");
      setActive(0);
      setCopied(false);
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      document.body.style.overflow = "";
      returnFocus.current?.focus?.();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Keep the active row visible while arrowing through.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (cmd) => {
    if (cmd.type === "copy") {
      navigator.clipboard
        ?.writeText(meta.email)
        .then(() => {
          setCopied(true);
          setTimeout(() => setOpen(false), 900);
        })
        .catch(() => setOpen(false));
      return;
    }
    if (cmd.type === "theme") {
      setOpen(false);
      // Reuse the toggle button so theme state (and its view-transition
      // wipe) stays in one place.
      requestAnimationFrame(() =>
        document.querySelector(".theme-toggle")?.click()
      );
      return;
    }
    if (cmd.type === "href") {
      setOpen(false);
      if (cmd.ext) window.open(cmd.href, "_blank", "noopener,noreferrer");
      else window.location.href = cmd.href;
      return;
    }
    // nav — synthesize an anchor click so the Lenis smooth-scroll
    // delegate in useSmoothScroll handles it exactly like a real link.
    setOpen(false);
    requestAnimationFrame(() => {
      const a = document.createElement("a");
      a.href = cmd.hash;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };

  const onInputKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      run(results[active]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="cmdk"
      role="dialog"
      aria-modal="true"
      aria-label="Command menu"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="cmdk-panel">
        <div className="cmdk-input-row">
          <span className="cmdk-glyph" aria-hidden="true">
            ✦
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Where to? Try “work” or “email”…"
            aria-label="Search commands"
            aria-activedescendant={
              results[active] ? `cmdk-${results[active].id}` : undefined
            }
          />
          <kbd>esc</kbd>
        </div>

        <ul className="cmdk-list" role="listbox" ref={listRef}>
          {results.length === 0 && (
            <li className="cmdk-empty" aria-disabled="true">
              Nothing for “{query}” — try “contact”.
            </li>
          )}
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`cmdk-${c.id}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "on" : ""}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(c)}
            >
              <span className="cmdk-label">
                {c.id === "copy-email" && copied ? "Copied ✓" : c.label}
              </span>
              <span className="cmdk-tag">{c.hint}</span>
            </li>
          ))}
        </ul>

        <div className="cmdk-foot" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> select
          </span>
          <span>
            <kbd>{isMac ? "⌘" : "ctrl"}</kbd>
            <kbd>K</kbd> toggle
          </span>
        </div>
      </div>
    </div>
  );
}
