import { useInView } from "../hooks/useInView";
import { useCountUp } from "../hooks/useCountUp";
import { Reveal } from "./Reveal";
import { useContent } from "../content/ContentContext";

function Stat({ value, suffix, label, hl, delay }) {
  const [ref, inView] = useInView({ rootMargin: "0px 0px -10% 0px" });
  const n = useCountUp(value, inView);

  return (
    <Reveal className={`cell${hl ? " hl" : ""}`} delay={delay}>
      <span className="n" ref={ref}>
        {n}
        {suffix && <span className="accent">{suffix}</span>}
      </span>
      <span className="l">{label}</span>
    </Reveal>
  );
}

export function Stats() {
  const { stats } = useContent();
  return (
    <div className="strip">
      {stats.map((s, i) => (
        <Stat key={s.label} {...s} delay={i * 0.06} />
      ))}
    </div>
  );
}
