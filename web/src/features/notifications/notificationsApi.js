import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const notificationsApi = createApi({
  reducerPath: "notificationsApi",
  tagTypes: ["NotificationList"],
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_URL ?? "http://localhost:3000",
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: ({ page = 1, limit = 20, filter = "all" } = {}) => {
        const params = new URLSearchParams({ page, limit, filter });
        return `/api/notifications?${params.toString()}`;
      },
      providesTags: [{ type: "NotificationList", id: "LIST" }],
    }),
    setNotificationRead: builder.mutation({
      query: ({ notificationId, isRead }) => ({
        url: `/api/notifications/${notificationId}`,
        method: "PATCH",
        body: { is_read: isRead },
      }),
      invalidatesTags: [{ type: "NotificationList", id: "LIST" }],
      onQueryStarted: async (
        { notificationId, isRead, notification },
        { dispatch, getState, queryFulfilled },
      ) => {
        const patches = [];
        if (isRead) {
          const cachedArgs = notificationsApi.util.selectCachedArgsForQuery(
            getState(),
            "getNotifications",
          );
          for (const args of cachedArgs) {
            patches.push(
              dispatch(
                notificationsApi.util.updateQueryData(
                  "getNotifications",
                  args,
                  (draft) => {
                    const itemIndex =
                      draft.data?.findIndex(
                        (notification) =>
                          String(notification.id) === String(notificationId),
                      ) ?? -1;
                    const item =
                      itemIndex >= 0 ? draft.data[itemIndex] : undefined;
                    if (item) {
                      item.is_read = true;
                      item.read_at = new Date().toISOString();
                    }

                    draft.unread_count = Math.max(
                      0,
                      (draft.unread_count ?? 0) - 1,
                    );
                    draft.read_count = (draft.read_count ?? 0) + 1;

                    if (args.filter === "unread" && itemIndex >= 0) {
                      draft.data.splice(itemIndex, 1);
                      const pagination = draft.pagination;
                      if (pagination) {
                        pagination.total_notifications = Math.max(
                          0,
                          (pagination.total_notifications ?? 0) - 1,
                        );
                        pagination.total_pages = Math.ceil(
                          pagination.total_notifications /
                            (pagination.limit || args.limit || 20),
                        );
                      }
                    } else if (
                      args.filter === "read" &&
                      !item &&
                      (args.page ?? 1) === 1 &&
                      notification
                    ) {
                      draft.data.unshift({
                        ...notification,
                        is_read: true,
                        read_at: new Date().toISOString(),
                      });
                      if (args.limit) draft.data.splice(args.limit);
                      if (draft.pagination) {
                        draft.pagination.total_notifications =
                          (draft.pagination.total_notifications ?? 0) + 1;
                        draft.pagination.total_pages = Math.ceil(
                          draft.pagination.total_notifications /
                            (draft.pagination.limit || args.limit || 20),
                        );
                      }
                    }
                  },
                ),
              ),
            );
          }
        }

        try {
          await queryFulfilled;
        } catch {
          for (const patch of patches.reverse()) patch.undo();
        }
      },
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({
        url: "/api/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: [{ type: "NotificationList", id: "LIST" }],
    }),
    deleteNotification: builder.mutation({
      query: (notificationId) => ({
        url: `/api/notifications/${notificationId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "NotificationList", id: "LIST" }],
    }),
  }),
});

export const {
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useSetNotificationReadMutation,
} = notificationsApi;
