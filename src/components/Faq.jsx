import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { useContent } from "../content/ContentContext";

export function Faq() {
  const { faq } = useContent();
  return (
    <section id="faq">
      <div className="wrap">
        <SectionHeading num="09" title="Real talk" />
        <Reveal as="p" className="lead">
          {faq.intro}
        </Reveal>
        <div className="faq">
          {faq.items.map((item, i) => (
            <Reveal className="qa" key={i} delay={(i % 2) * 0.08} data-glow>
              <h3 className="q">{item.q}</h3>
              <p className="a">{item.a}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
