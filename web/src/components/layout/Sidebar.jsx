import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../../features/auth/authSlice";
import { useGetNotificationsQuery } from "../../features/notifications/notificationsApi";

const menu = [
  { label: "Main", to: "/" },
  { label: "Authors", to: "/authors" },
  { label: "Categories", to: "/categories" },
  { label: "Profile", to: "/profile" },
  { label: "Notifications", to: "/notifications" },
];

export function Sidebar() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { data: notifications } = useGetNotificationsQuery(
    { page: 1, limit: 1, filter: "unread" },
    { skip: !isAuthenticated },
  );
  const visibleMenu = isAuthenticated
    ? menu
    : menu.filter(
        (item) =>
          item.to === "/" ||
          item.to === "/authors" ||
          item.to === "/categories",
      );

  return (
    <aside className="sidebar">
      <nav className="sidebar-menu" aria-label="Main navigation">
        {visibleMenu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            {item.label}
            {item.to === "/notifications" &&
              notifications?.unread_count > 0 && (
                <span
                  className="nav-item__badge"
                  aria-label={`${notifications.unread_count} unread`}
                >
                  {notifications.unread_count > 99
                    ? "99+"
                    : notifications.unread_count}
                </span>
              )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
