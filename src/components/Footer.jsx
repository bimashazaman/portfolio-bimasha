import { useContent } from "../content/ContentContext";

export function Footer() {
  const { meta } = useContent();
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="wrap">
        <p className="footer-signoff">
          Thanks for scrolling all the way down<span className="accent">.</span> Let&rsquo;s
          build something that lasts.
        </p>
        <div className="footer-row">
          <span>
            © {year} {meta.name}
          </span>
          <nav className="footer-links" aria-label="Social and navigation">
            <a href={meta.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
            <a href={meta.github} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a className="top" href="#top">
              Back to top ↑
            </a>
          </nav>
          <span>Every claim on this site is verifiable.</span>
        </div>
      </div>
    </footer>
  );
}
