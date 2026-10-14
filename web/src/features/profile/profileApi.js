import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
export const profileApi = createApi({
    reducerPath: 'profileApi',
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.REACT_APP_API_URL ?? 'http://localhost:3000',
    }),
    endpoints: (builder) => ({
        getProfile: builder.query({
            query: () => '/api/profile',
        }),
    }),
});
export const { useGetProfileQuery } = profileApi;
