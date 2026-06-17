import { useContent } from "../content/ContentContext";

/** Seamless scrolling status line at the foot of the hero. */
export function Marquee() {
  const { ticker } = useContent();
  // Doubled so the -50% keyframe loops without a visible seam.
  const items = [...ticker, ...ticker];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {items.map((item, i) => (
          <span className="ticker-item" key={i}>
            <b>{item.tag}</b>
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
