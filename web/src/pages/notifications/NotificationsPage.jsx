import { EmptyState } from '../../components/common/EmptyState';
import { useGetNotificationsQuery } from '../../features/notifications/notificationsApi';
export function NotificationsPage() {
    const { data: notifications = [], isLoading, isError } = useGetNotificationsQuery();
    return (<section className="page-block">
      <div className="page-header">
        <div>
          <p className="eyebrow">Updates</p>
          <h2>Notifications</h2>
        </div>
      </div>

      {isLoading ? (<p>Loading notifications...</p>) : isError ? (<p>Notifications are unavailable.</p>) : notifications.length > 0 ? (<ul className="notification-list">
          {notifications.map((item) => (<li key={item.id} className="notification-item">
              {item.message}
            </li>))}
        </ul>) : (<EmptyState title="No notifications" description="You are all caught up."/>)}
    </section>);
}
