import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { useContent } from "../content/ContentContext";

export function Journey() {
  const { journey } = useContent();
  return (
    <section id="journey">
      <div className="wrap">
        <SectionHeading num="06" title="Journey" />
        <div className="tl">
          {journey.map((j) => (
            <Reveal className="tl-item" key={j.title}>
              <span className="yr">{j.year}</span>
              <div>
                <h3>{j.title}</h3>
                <span className="role">{j.role}</span>
                <p>{j.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
