import { useEffect, useMemo, useState } from "react";
import { useScrolled } from "../hooks/useScrolled";
import { useActiveSection } from "../hooks/useActiveSection";
import { ThemeToggle } from "./ThemeToggle";
import { useContent } from "../content/ContentContext";

export function Nav() {
  const { nav: navItems, meta } = useContent();
  const scrolled = useScrolled();
  const sectionIds = useMemo(
    () => ["top", ...navItems.map((item) => item.href.slice(1))],
    [navItems]
  );
  const active = useActiveSection(sectionIds);
  const [open, setOpen] = useState(false);

  // Lock the page behind the open overlay; release + close on Escape.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="wrap">
          <a href="#top" className="logo" aria-label={`${meta.name} — home`}>
            Bimasha<span className="dot">.</span>Zaman
          </a>

          <div className="nav-right">
            <nav className="nav-links" aria-label="Primary">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={
                    active === item.href.slice(1) ? "location" : undefined
                  }
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <a className="nav-cta" href="#contact">
              Let&rsquo;s talk
            </a>
            <button
              className="cmdk-chip"
              onClick={() => window.dispatchEvent(new Event("open-cmdk"))}
              aria-label="Open command menu"
              title="Command menu"
            >
              ⌘K
            </button>
            <ThemeToggle />
            <button
              className={`burger${open ? " open" : ""}`}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`menu${open ? " open" : ""}`}
        inert={!open ? true : undefined}
      >
        <ol>
          {navItems.map((item, i) => (
            <li key={item.href} style={{ "--i": i }}>
              <a href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            </li>
          ))}
        </ol>
        <div className="menu-foot">
          <a href={`mailto:${meta.email}`} onClick={() => setOpen(false)}>
            {meta.email}
          </a>
          <span>{meta.location}</span>
        </div>
      </div>
    </>
  );
}
