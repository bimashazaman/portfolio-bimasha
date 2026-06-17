import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { useContent } from "../content/ContentContext";

export function Services() {
  const { services } = useContent();
  return (
    <section id="services">
      <div className="wrap">
        <SectionHeading num="02" title="Three things I'm hired for" />
        <div className="offers">
          {services.map((s, i) => (
            <Reveal className="offer" key={s.title} delay={i * 0.08} data-glow>
              <span className="idx">{s.idx}</span>
              <h3>{s.title}</h3>
              {s.lead && <p className="offer-lead">{s.lead}</p>}
              <p>{s.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
