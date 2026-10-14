import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
export const postsApi = createApi({
    reducerPath: 'postsApi',
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.REACT_APP_API_URL ?? 'http://localhost:3000',
    }),
    endpoints: (builder) => ({
        getPosts: builder.query({
            query: () => '/api/posts',
        }),
    }),
});
export const { useGetPostsQuery } = postsApi;
