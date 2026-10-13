import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
export const notificationsApi = createApi({
    reducerPath: 'notificationsApi',
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
    }),
    endpoints: (builder) => ({
        getNotifications: builder.query({
            query: () => '/api/notifications',
        }),
    }),
});
export const { useGetNotificationsQuery } = notificationsApi;
