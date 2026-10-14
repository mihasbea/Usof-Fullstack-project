import { Button } from '../../components/common/Button';
import { useGetProfileQuery } from '../../features/profile/profileApi';
export function ProfilePage() {
    const { data: profile, isLoading, isError } = useGetProfileQuery();
    if (isLoading) {
        return <p>Loading profile...</p>;
    }
    if (isError || !profile) {
        return <p>Profile could not be loaded.</p>;
    }
    return (<section className="page-block">
      <div className="page-header">
        <div>
          <p className="eyebrow">User</p>
          <h2>Profile</h2>
        </div>
        <Button variant="secondary">Edit profile</Button>
      </div>

      <div className="profile-card">
        <div className="avatar-large">{profile.login.charAt(0).toUpperCase()}</div>
        <div>
          <h3>{profile.login}</h3>
          <p>{profile.fullName}</p>
          <p>{profile.email}</p>
          <p>Role: {profile.role}</p>
        </div>
      </div>
    </section>);
}
