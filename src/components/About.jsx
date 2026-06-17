import { useState } from "react";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { useContent } from "../content/ContentContext";

/** Avatar: shows the photo if present, gracefully falls back to initials. */
function Avatar({ photo, initials, name }) {
  const [ok, setOk] = useState(Boolean(photo));
  if (photo && ok) {
    return (
      <span className="avatar">
        <img src={photo} alt={name} onError={() => setOk(false)} />
      </span>
    );
  }
  return (
    <span className="avatar" aria-hidden="true">
      {initials}
    </span>
  );
}

export function About() {
  const { about } = useContent();
  const { profile } = about;
  return (
    <section id="about">
      <div className="wrap">
        <SectionHeading num="01" title="About" />
        <div className="about-grid">
          <Reveal>
            <p className="lede">
              {about.lede.map((part, i) =>
                typeof part === "string" ? part : <em key={i}>{part.em}</em>
              )}
            </p>
            <div className="about-body">
              {about.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Reveal>

          <Reveal as="aside" className="about-aside" delay={0.1}>
            <div className="profile-head">
              <Avatar
                photo={profile.photo}
                initials={profile.initials}
                name={profile.name}
              />
              <span className="profile-id">
                <strong>{profile.name}</strong>
                <span>{profile.role}</span>
              </span>
            </div>
            <dl className="facts">
              {about.facts.map((f) => (
                <div className="fact" key={f.k}>
                  <dt className="k">{f.k}</dt>
                  <dd className="v">{f.v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
