import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <BrandLogo />
          <p>Put knowledge to use.</p>
        </div>
        <nav className="site-footer__links" aria-label="Footer navigation">
          <Link to="/">Discussions</Link>
          <Link to="/authors">Authors</Link>
          <Link to="/categories">Topics</Link>
        </nav>
        <p className="site-footer__copyright">
          © {new Date().getFullYear()} Usof Forum
        </p>
      </div>
    </footer>
  );
}
