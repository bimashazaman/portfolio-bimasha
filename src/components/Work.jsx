import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { useContent } from "../content/ContentContext";

export function Work() {
  const { cases, workIndex } = useContent();
  return (
    <section id="work">
      <div className="wrap">
        <SectionHeading num="03" title="Selected work" />

        <div className="cases">
          {cases.map((c, i) => (
            <Reveal className="case" key={c.cn}>
              <div className="meta">
                <span className="case-num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="cn">
                  {c.cn}
                  {c.live && (
                    <span className="live-chip">
                      <i aria-hidden="true" /> Live
                    </span>
                  )}
                </span>
                <h3>{c.title}</h3>
                <span className="sub">{c.sub}</span>
              </div>
              <div className="body">
                {c.takeaway && <p className="takeaway">{c.takeaway}</p>}
                {c.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <div className="tags">
                  {c.tags.map((t) => (
                    <span className="tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
                {c.link && (
                  <a
                    className="case-link"
                    href={c.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {c.link.label}
                  </a>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="windex">
          <span className="wi-kicker">{workIndex.kicker}</span>
          <p className="wi-lede">{workIndex.lede}</p>
          {workIndex.rows.map((r) => (
            <div className="wi-row" key={r.nm}>
              <span className="nm">{r.nm}</span>
              <span className="ds">{r.ds}</span>
              <span className="lc">{r.lc}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
