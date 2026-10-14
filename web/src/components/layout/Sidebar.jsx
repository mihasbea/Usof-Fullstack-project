import { NavLink } from 'react-router-dom';
const menu = [
    { label: 'Main', to: '/' },
    { label: 'Profile', to: '/profile' },
    { label: 'Notifications', to: '/notifications' },
];
export function Sidebar() {
    return (<aside className="sidebar">
      <nav className="sidebar-menu" aria-label="Main navigation">
        {menu.map((item) => (<NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            {item.label}
          </NavLink>))}
      </nav>
    </aside>);
}
