import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../../features/auth/authSlice';
const menu = [
    { label: 'Main', to: '/' },
    { label: 'Profile', to: '/profile' },
    { label: 'Notifications', to: '/notifications' },
];
export function Sidebar() {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const visibleMenu = isAuthenticated ? menu : menu.slice(0, 1);

    return (<aside className="sidebar">
      <nav className="sidebar-menu" aria-label="Main navigation">
        {visibleMenu.map((item) => (<NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            {item.label}
          </NavLink>))}
      </nav>
    </aside>);
}
