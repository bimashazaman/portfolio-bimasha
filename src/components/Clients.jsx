import { Reveal } from "./Reveal";
import { useContent } from "../content/ContentContext";

/** Quiet credibility band: real teams/products shipped for. */
export function Clients() {
  const { clients } = useContent();
  return (
    <Reveal className="clients">
      <div className="wrap">
        <span className="clients-label">{clients.label}</span>
        <ul className="clients-row">
          {clients.names.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}
