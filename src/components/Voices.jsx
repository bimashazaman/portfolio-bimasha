import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { useContent } from "../content/ContentContext";

export function Voices() {
  const { voices } = useContent();
  return (
    <section id="voices">
      <div className="wrap">
        <SectionHeading num="08" title="What clients say" />
        <div className="voices">
          {voices.map((v, i) => (
            <Reveal className="voice" key={v.who} delay={i * 0.08} data-glow>
              <blockquote>{v.quote}</blockquote>
              <span className="who">{v.who}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
