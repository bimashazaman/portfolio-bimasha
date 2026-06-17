import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { useContent } from "../content/ContentContext";

export function Process() {
  const { process } = useContent();
  return (
    <section id="how">
      <div className="wrap">
        <SectionHeading num="07" title="How I work" />
        <div className="how">
          {process.map((row, i) => (
            <Reveal className="how-row" key={i}>
              <p>
                {row.map((seg, j) =>
                  seg.b ? <b key={j}>{seg.t}</b> : <span key={j}>{seg.t}</span>
                )}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
