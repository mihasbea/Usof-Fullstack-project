import { Link } from 'react-router-dom';
export function Header() {
    return (<header className="topbar">
      <div className="brand-wrap">
        <Link to="/" className="brand">
          USOF<span className="brand-mark">;</span>
        </Link>
      </div>

      <div className="header-search">
        <input type="search" placeholder="Search posts, users, comments..."/>
      </div>

      <div className="header-user">
        <div className="user-avatar">M</div>
        <div className="user-meta">
          <strong>mmykhalchenko</strong>
          <span>user</span>
        </div>
      </div>
    </header>);
}
