import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { authApi, useLogoutUserMutation } from "../../features/auth/authApi";
import { logout, selectCurrentUser } from "../../features/auth/authSlice";
import { notificationsApi } from "../../features/notifications/notificationsApi";
import { postsApi } from "../../features/posts/postsApi";
import { profileApi } from "../../features/profile/profileApi";

export function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectCurrentUser);
  const [logoutUser, { isLoading }] = useLogoutUserMutation();
  const [logoutError, setLogoutError] = useState("");
  const [search, setSearch] = useState(
    () => new URLSearchParams(location.search).get("search") ?? "",
  );
  const searchParams = new URLSearchParams(location.search);
  const activeSearch = searchParams.get("search")?.trim() ?? "";
  const requestedSearchType = searchParams.get("type");
  const searchType = ["users", "categories"].includes(requestedSearchType)
    ? requestedSearchType
    : "posts";
  const apiUrl = process.env.REACT_APP_API_URL ?? "http://localhost:3000";
  const avatarInitial = (user?.login || user?.full_name || "G")
    .charAt(0)
    .toUpperCase();
  const avatarUrl = user?.profile_picture
    ? new URL(user.profile_picture, apiUrl).toString()
    : null;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get("search") ?? "");
  }, [location.search]);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate({
      pathname: "/",
      search: query
        ? `?search=${encodeURIComponent(query)}&type=${encodeURIComponent(searchType)}`
        : "",
    });
  };

  const chooseSearchType = (type) => {
    navigate({
      pathname: "/",
      search: `?search=${encodeURIComponent(activeSearch)}&type=${type}`,
    });
  };

  const handleLogout = async () => {
    setLogoutError("");
    try {
      await logoutUser().unwrap();
      dispatch(logout());
      dispatch(authApi.util.resetApiState());
      dispatch(notificationsApi.util.resetApiState());
      dispatch(postsApi.util.resetApiState());
      dispatch(profileApi.util.resetApiState());
      navigate("/", { replace: true });
    } catch (error) {
      setLogoutError(
        error?.data?.message || "Could not log out. Please try again.",
      );
    }
  };

  return (
    <>
      <header className="topbar">
        <div className="brand-wrap">
          <BrandLogo />
        </div>

        <form className="header-search" role="search" onSubmit={handleSearch}>
          <label className="sr-only" htmlFor="site-search">
            Search posts, users, comments, or categories
          </label>
          <input
            id="site-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search posts, users, comments, or categories..."
            maxLength={255}
          />
          <button
            type="submit"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          >
            Submit search
          </button>
        </form>

        <div className="header-user">
          {user && (
            <Link
              to="/profile"
              className="header-profile-link"
              aria-label={`Open ${user.login}'s profile`}
            >
              <span className="user-avatar" aria-hidden="true">
                {avatarInitial}
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.hidden = true;
                    }}
                  />
                )}
              </span>
              <span className="user-meta">
                <strong>{user.login}</strong>
                <span>{user.role || "member"}</span>
              </span>
            </Link>
          )}
          {user && (
            <button
              type="button"
              className="header-logout"
              onClick={handleLogout}
              disabled={isLoading}
            >
              {isLoading ? "Logging out..." : "Log out"}
            </button>
          )}
          {!user && (
            <div className="header-auth-actions">
              <Link to="/login" className="header-auth-link">
                Log in
              </Link>
              <Link to="/signup" className="btn btn-primary header-signup">
                Sign up
              </Link>
            </div>
          )}
          {logoutError && (
            <span className="header-logout-error" role="alert">
              {logoutError}
            </span>
          )}
        </div>
      </header>
      {location.pathname === "/" && activeSearch && (
        <nav className="search-subheader" aria-label="Search result types">
          <div className="search-subheader__inner">
            {[
              { id: "posts", label: "Posts & comments" },
              { id: "users", label: "Users" },
              { id: "categories", label: "Categories" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`search-subheader__tab${searchType === tab.id ? " is-active" : ""}`}
                aria-current={searchType === tab.id ? "page" : undefined}
                onClick={() => chooseSearchType(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
