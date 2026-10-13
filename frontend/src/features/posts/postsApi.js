import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
export const postsApi = createApi({
    reducerPath: 'postsApi',
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
    }),
    endpoints: (builder) => ({
        getPosts: builder.query({
            query: () => '/api/posts',
        }),
    }),
});
export const { useGetPostsQuery } = postsApi;
