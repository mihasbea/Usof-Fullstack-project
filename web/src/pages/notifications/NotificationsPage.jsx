import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useSetNotificationReadMutation,
} from "../../features/notifications/notificationsApi";

const PAGE_SIZE = 20;

const NOTIFICATION_TYPES = {
  post_updated: {
    label: "Post update",
  },
  post_commented: {
    label: "New comment",
  },
  category_new_post: {
    label: "New post in a topic",
  },
  category_deleted: {
    label: "Topic update",
  },
  post_liked: {
    label: "Post liked",
  },
};

function getNotificationData(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function getNotificationTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { label: "Date unavailable", group: "Earlier" };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const notificationDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const daysAgo = Math.round((today - notificationDay) / 86400000);

  if (daysAgo === 0) {
    return {
      label: `Today, ${date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })}`,
      group: "Today",
    };
  }
  if (daysAgo === 1) {
    return {
      label: `Yesterday, ${date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })}`,
      group: "Yesterday",
    };
  }
  return {
    label: date.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    group: "Earlier",
  };
}

function getErrorMessage(error, fallback) {
  return error?.data?.message || fallback;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("unread");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState("");
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery({
    page,
    limit: PAGE_SIZE,
    filter: activeFilter,
  });
  const [setNotificationRead] = useSetNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAllRead }] =
    useMarkAllNotificationsReadMutation();
  const [deleteNotification, { isLoading: isDeleting }] =
    useDeleteNotificationMutation();

  const notifications = data?.data ?? [];
  const unreadCount = data?.unread_count ?? 0;
  const readCount = data?.read_count ?? 0;
  const pagination = data?.pagination;
  const totalCount = data?.total_count ?? 0;
  const totalPages = pagination?.total_pages ?? 1;

  useEffect(() => {
    if (page > totalPages) setPage(Math.max(1, totalPages));
  }, [page, totalPages]);

  const groupedNotifications = useMemo(() => {
    const groups = new Map();
    for (const notification of notifications) {
      const time = getNotificationTime(
        activeFilter === "read"
          ? notification.read_at || notification.created_at
          : notification.created_at,
      );
      if (!groups.has(time.group)) groups.set(time.group, []);
      groups.get(time.group).push({ ...notification, timeLabel: time.label });
    }
    return [...groups.entries()];
  }, [activeFilter, notifications]);

  const handleOpenNotification = async (event, notification) => {
    const dataForNotification = getNotificationData(notification.data);
    const postId = dataForNotification.post?.id ?? notification.post_id;
    const commentId = dataForNotification.comment?.id;
    const suggestedIds = (dataForNotification.suggested_categories ?? [])
      .map((category) => category.id)
      .filter(Boolean)
      .join(",");
    const destination = postId
      ? notification.type === "category_deleted"
        ? `/posts/${postId}/edit?focus=categories${suggestedIds ? `&suggested=${suggestedIds}` : ""}`
        : `/posts/${postId}${commentId ? `#comment-${commentId}` : ""}`
      : dataForNotification.category?.id
        ? `/categories?category=${dataForNotification.category.id}`
        : null;
    if (!destination) return;

    event.preventDefault();
    setActionError("");
    try {
      if (!notification.is_read) {
        await setNotificationRead({
          notificationId: notification.id,
          isRead: true,
          notification,
        }).unwrap();
      }
      navigate(destination);
    } catch (mutationError) {
      setActionError(
        getErrorMessage(mutationError, "Could not open this notification."),
      );
    }
  };

  const handleMarkAllRead = async () => {
    setActionError("");
    try {
      await markAllRead().unwrap();
    } catch (mutationError) {
      setActionError(
        getErrorMessage(
          mutationError,
          "Could not mark all notifications as read.",
        ),
      );
    }
  };

  const handleDelete = async (notificationId) => {
    setActionError("");
    try {
      await deleteNotification(notificationId).unwrap();
    } catch (mutationError) {
      setActionError(
        getErrorMessage(mutationError, "Could not delete this notification."),
      );
    }
  };

  return (
    <section className="page-block notifications-page">
      <div className="notifications-toolbar">
        <div
          className="notifications-filters"
          role="group"
          aria-label="Filter notifications"
        >
          <button
            type="button"
            className={`notifications-filter${activeFilter === "all" ? " is-active" : ""}`}
            aria-pressed={activeFilter === "all"}
            onClick={() => {
              setActiveFilter("all");
              setPage(1);
            }}
          >
            All
            <span>{totalCount}</span>
          </button>
          <button
            type="button"
            className={`notifications-filter${activeFilter === "unread" ? " is-active" : ""}`}
            aria-pressed={activeFilter === "unread"}
            onClick={() => {
              setActiveFilter("unread");
              setPage(1);
            }}
          >
            Unread
            <span>{unreadCount}</span>
          </button>
          <button
            type="button"
            className={`notifications-filter${activeFilter === "read" ? " is-active" : ""}`}
            aria-pressed={activeFilter === "read"}
            onClick={() => {
              setActiveFilter("read");
              setPage(1);
            }}
          >
            Read
            <span>{readCount}</span>
          </button>
        </div>
        <button
          type="button"
          className="notifications-mark-all"
          disabled={unreadCount === 0 || isMarkingAllRead}
          onClick={handleMarkAllRead}
        >
          {isMarkingAllRead ? "Marking as read..." : "Mark all as read"}
        </button>
      </div>

      {actionError && (
        <div className="notifications-error" role="alert">
          <span>{actionError}</span>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setActionError("")}
          >
            ×
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="notifications-skeleton-list" aria-busy="true">
          {[1, 2, 3].map((item) => (
            <div className="notifications-skeleton" key={item}>
              <div>
                <span />
                <span />
              </div>
            </div>
          ))}
          <p className="visually-hidden" role="status">
            Loading notifications...
          </p>
        </div>
      ) : isError ? (
        <div className="notifications-load-error">
          <h2>Notifications could not be loaded</h2>
          <p>
            {getErrorMessage(error, "Check your connection and try again.")}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={refetchNotifications}
          >
            Try again
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">
          <h2>
            {activeFilter === "unread"
              ? "You're all caught up"
              : activeFilter === "read"
                ? "No recently read notifications"
                : "No notifications yet"}
          </h2>
          <p>
            {activeFilter === "unread"
              ? "There are no unread updates right now. Check back when the community has something new."
              : activeFilter === "read"
                ? "Read notifications are kept here for one week."
                : "When there is an update to a post or topic you follow, you will find it here."}
          </p>
          {activeFilter !== "all" ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setActiveFilter(activeFilter === "read" ? "unread" : "all");
                setPage(1);
              }}
            >
              {activeFilter === "read"
                ? "View unread notifications"
                : "View all notifications"}
            </button>
          ) : (
            <Link to="/" className="btn btn-primary">
              Explore the community
            </Link>
          )}
        </div>
      ) : (
        <div
          className={`notifications-content${isFetching ? " is-fetching" : ""}`}
          aria-busy={isFetching}
        >
          {groupedNotifications.map(([group, items]) => (
            <section
              className="notification-group"
              key={group}
              aria-label={group}
            >
              <h2 className="notification-group__title">{group}</h2>
              <ul className="notification-list">
                {items.map((notification) => {
                  const type =
                    NOTIFICATION_TYPES[notification.type] ??
                    NOTIFICATION_TYPES.post_updated;
                  const dataForNotification = getNotificationData(
                    notification.data,
                  );
                  const postId =
                    dataForNotification.post?.id ?? notification.post_id;
                  const suggestedIds = (
                    dataForNotification.suggested_categories ?? []
                  )
                    .map((category) => category.id)
                    .filter(Boolean)
                    .join(",");
                  const destination = postId
                    ? notification.type === "category_deleted"
                      ? `/posts/${postId}/edit?focus=categories${suggestedIds ? `&suggested=${suggestedIds}` : ""}`
                      : `/posts/${postId}${
                          dataForNotification.comment?.id
                            ? `#comment-${dataForNotification.comment.id}`
                            : ""
                        }`
                    : dataForNotification.category?.id
                      ? `/categories?category=${dataForNotification.category.id}`
                      : null;

                  return (
                    <li
                      key={notification.id}
                      className={`notification-item${notification.is_read ? "" : " is-unread"}`}
                    >
                      <div className="notification-item__main">
                        <div className="notification-item__meta">
                          <span className="notification-item__type">
                            {type.label}
                          </span>
                          <time
                            dateTime={notification.created_at}
                            title={new Date(
                              notification.created_at,
                            ).toLocaleString()}
                          >
                            {notification.timeLabel}
                          </time>
                        </div>
                        {destination ? (
                          <Link
                            className="notification-item__message"
                            to={destination}
                            onClick={(event) =>
                              handleOpenNotification(event, notification)
                            }
                          >
                            {notification.message}
                          </Link>
                        ) : (
                          <p className="notification-item__message">
                            {notification.message}
                          </p>
                        )}
                        {dataForNotification.post?.title && (
                          <span className="notification-item__post-title">
                            {dataForNotification.post.title}
                          </span>
                        )}
                      </div>
                      <div className="notification-item__actions">
                        <button
                          type="button"
                          className="notification-item__action notification-item__action--delete"
                          disabled={isDeleting}
                          onClick={() => handleDelete(notification.id)}
                          aria-label="Delete notification"
                          title="Delete notification"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            focusable="false"
                          >
                            <path d="M6 6 18 18M18 6 6 18" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {totalPages > 1 && (
            <nav
              className="notifications-pagination"
              aria-label="Notification pages"
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </div>
      )}
    </section>
  );
}
