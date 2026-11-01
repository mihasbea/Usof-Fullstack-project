import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi, useLogoutUserMutation } from '../../features/auth/authApi';
import { logout, selectCurrentUser } from '../../features/auth/authSlice';

export function Header() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useSelector(selectCurrentUser);
    const [logoutUser, { isLoading }] = useLogoutUserMutation();
    const [logoutError, setLogoutError] = useState('');
    const [search, setSearch] = useState(
        () => new URLSearchParams(location.search).get('search') ?? ''
    );
    const apiUrl = process.env.REACT_APP_API_URL ?? 'http://localhost:3000';
    const avatarInitial = (user?.login || user?.full_name || 'G').charAt(0).toUpperCase();
    const avatarUrl = user?.profile_picture
        ? new URL(user.profile_picture, apiUrl).toString()
        : null;

    useEffect(() => {
        setSearch(new URLSearchParams(location.search).get('search') ?? '');
    }, [location.search]);

    const handleSearch = (event) => {
        event.preventDefault();
        const query = search.trim();
        navigate({
            pathname: '/',
            search: query ? `?search=${encodeURIComponent(query)}` : '',
        });
    };

    const handleLogout = async () => {
        setLogoutError('');
        try {
            await logoutUser().unwrap();
            dispatch(logout());
            dispatch(authApi.util.resetApiState());
            navigate('/', { replace: true });
        } catch (error) {
            setLogoutError(error?.data?.message || 'Could not log out. Please try again.');
        }
    };

    return (
        <header className="topbar">
            <div className="brand-wrap">
                <Link to="/" className="brand">
                    USOF<span className="brand-mark">;</span>
                </Link>
            </div>

            <form className="header-search" role="search" onSubmit={handleSearch}>
                <label className="sr-only" htmlFor="site-search">Search posts</label>
                <input
                    id="site-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search posts or authors..."
                />
                <button type="submit" className="header-search-button">Search</button>
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
                            <span>{user.role || 'member'}</span>
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
                        {isLoading ? 'Logging out...' : 'Log out'}
                    </button>
                )}
                {!user && (
                    <div className="header-auth-actions">
                        <Link to="/login" className="header-auth-link">Log in</Link>
                        <Link to="/signup" className="btn btn-primary header-signup">Sign up</Link>
                    </div>
                )}
                {logoutError && <span className="header-logout-error" role="alert">{logoutError}</span>}
            </div>
        </header>
    );
}
