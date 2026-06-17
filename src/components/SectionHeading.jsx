import { Reveal } from "./Reveal";

/** The numbered "01 — About — ———" heading used atop each section. */
export function SectionHeading({ num, title }) {
  return (
    <Reveal className="sec-head">
      <span className="num">{num}</span>
      <h2>{title}</h2>
      <span className="rule" aria-hidden="true" />
    </Reveal>
  );
}
