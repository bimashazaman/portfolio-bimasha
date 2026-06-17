import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { useContent } from "../content/ContentContext";

export function Engagements() {
  const { engagements, meta } = useContent();
  return (
    <section id="work-with-me">
      <div className="wrap">
        <SectionHeading num="10" title="Ways to work together" />
        <Reveal as="p" className="lead">
          {engagements.intro}
        </Reveal>
        <div className="engage">
          {engagements.items.map((it, i) => (
            <Reveal className="engage-card" key={it.k} delay={i * 0.08} data-glow>
              <span className="engage-k">{it.k}</span>
              <h3>{it.title}</h3>
              <p>{it.body}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="engage-cta" delay={0.1}>
          <span>Not sure which fits?</span>
          <a href={`mailto:${meta.email}`} className="engage-link">
            Tell me what you&rsquo;re building <span aria-hidden="true">→</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
