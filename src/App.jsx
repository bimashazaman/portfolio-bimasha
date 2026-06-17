import { useEffect } from "react";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { Cursor } from "./components/Cursor";
import { CommandMenu } from "./components/CommandMenu";
import { ScrollProgress } from "./components/ScrollProgress";
import { BackToTop } from "./components/BackToTop";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Stats } from "./components/Stats";
import { Clients } from "./components/Clients";
import { About } from "./components/About";
import { Services } from "./components/Services";
import { Engagements } from "./components/Engagements";
import { Work } from "./components/Work";
import { Spotlight } from "./components/Spotlight";
import { Stack } from "./components/Stack";
import { Journey } from "./components/Journey";
import { Process } from "./components/Process";
import { Voices } from "./components/Voices";
import { Faq } from "./components/Faq";
import { HireBand } from "./components/HireBand";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";

/** One delegated listener drives the cursor-tracking glow on [data-glow] cards. */
function useCardGlow() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return undefined;
    const onMove = (e) => {
      const card = e.target.closest?.("[data-glow]");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--gx", `${e.clientX - r.left}px`);
      card.style.setProperty("--gy", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
}

export default function App() {
  useSmoothScroll();
  useCardGlow();

  return (
    <>
      <a className="skip" href="#about">
        Skip to content
      </a>
      <ScrollProgress />
      <Cursor />
      <CommandMenu />
      <Nav />

      <main>
        <Hero />
        <Stats />
        <Clients />
        <About />
        <Services />
        <Work />
        <Spotlight />
        <Stack />
        <Journey />
        <Process />
        <Voices />
        <Faq />
        <Engagements />
        <HireBand />
        <Contact />
      </main>

      <Footer />
      <BackToTop />
    </>
  );
}
