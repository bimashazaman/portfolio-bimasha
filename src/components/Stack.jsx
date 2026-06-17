import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { useContent } from "../content/ContentContext";

export function Stack() {
  const { stack } = useContent();
  return (
    <section id="stack">
      <div className="wrap">
        <SectionHeading num="05" title="Tools are the easy part" />
        <Reveal as="p" className="lead">
          Outcomes are what you&rsquo;re buying. But your engineers will want to
          know what I ship with every day, so here it is, honestly.
        </Reveal>
        <div className="stack">
          {stack.map((col, i) => (
            <Reveal className="stack-col" key={col.group} delay={i * 0.06} data-glow>
              <h4>{col.group}</h4>
              <ul>
                {col.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
