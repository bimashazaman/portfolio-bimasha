import { useEffect, useState } from "react";

/**
 * Tracks which page section currently sits in the reading band near the
 * top of the viewport — used to highlight the matching nav link.
 */
export function useActiveSection(ids) {
  const [active, setActive] = useState(null);

  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (els.length === 0) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      // Only a narrow band (25%–35% from the top) decides the active section,
      // so exactly one section wins at a time.
      { rootMargin: "-25% 0px -65% 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids.join(" ")]); // eslint-disable-line react-hooks/exhaustive-deps

  return active;
}
