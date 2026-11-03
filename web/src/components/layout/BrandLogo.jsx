import { Link } from "react-router-dom";

export function BrandLogo({ to = "/", className = "" }) {
  return (
    <Link
      to={to}
      className={`brand ${className}`.trim()}
      aria-label="USOF home"
    >
      USOF
      <span className="brand-logo-end" aria-hidden="true">
        ;
      </span>
    </Link>
  );
}
