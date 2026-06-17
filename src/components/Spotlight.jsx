import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { useContent } from "../content/ContentContext";

export function Spotlight() {
  const { spotlight } = useContent();
  return (
    <section id="building">
      <div className="wrap">
        <SectionHeading num="04" title="Now building" />
        <Reveal className="spotlight">
          <span className="chip">
            <i aria-hidden="true" />
            {spotlight.chip}
          </span>
          <h3>{spotlight.title}</h3>
          {spotlight.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <span className="solo">{spotlight.solo}</span>
        </Reveal>
      </div>
    </section>
  );
}
