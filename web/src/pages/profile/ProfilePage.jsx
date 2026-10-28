import { skipToken } from '@reduxjs/toolkit/query';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { useGetProfileQuery } from '../../features/profile/profileApi';

const API_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3000';

export function ProfilePage() {
    const currentUser = useSelector(selectCurrentUser);
    const userId = currentUser?.id;
    const {
        data: profile,
        error,
        isError,
        isLoading,
        refetch,
    } = useGetProfileQuery(userId ?? skipToken);

    if (!userId) {
        return (
            <section className="page-block" aria-labelledby="profile-title">
                <h2 id="profile-title">Profile</h2>
                <p role="alert">Could not determine the current user. Please sign in again.</p>
            </section>
        );
    }

    if (isLoading) {
        return (
            <section className="page-block" aria-labelledby="profile-title" aria-busy="true">
                <h2 id="profile-title">Profile</h2>
                <p role="status">Loading profile...</p>
            </section>
        );
    }

    if (isError) {
        const errorMessage =
            error?.data?.message || 'The profile could not be loaded. Please try again.';

        return (
            <section className="page-block" aria-labelledby="profile-title">
                <h2 id="profile-title">Profile</h2>
                <p role="alert">{errorMessage}</p>
                <button type="button" className="btn btn-secondary" onClick={refetch}>
                    Try again
                </button>
            </section>
        );
    }

    if (!profile) {
        return (
            <section className="page-block" aria-labelledby="profile-title">
                <h2 id="profile-title">Profile</h2>
                <p role="alert">The API returned no profile data.</p>
            </section>
        );
    }

    const avatarInitial = (profile.login || profile.full_name || '?').charAt(0).toUpperCase();
    const avatarUrl = profile.profile_picture
        ? new URL(profile.profile_picture, API_URL).toString()
        : null;

    return (
        <section className="page-block" aria-labelledby="profile-title">
            <div className="page-header">
                <div>
                    <p className="eyebrow">User</p>
                    <h2 id="profile-title">Profile</h2>
                </div>
            </div>

            <div className="profile-card">
                <div className="profile-avatar" aria-hidden="true">
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
                </div>
                <div>
                    <h3>{profile.login}</h3>
                    <p>{profile.full_name}</p>
                    <p>{profile.email}</p>
                    <p>Role: {profile.role}</p>
                </div>
            </div>
        </section>
    );
}
