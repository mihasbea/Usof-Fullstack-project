import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
export const postsApi = createApi({
    reducerPath: 'postsApi',
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.REACT_APP_API_URL ?? 'http://localhost:3000',
    }),
    endpoints: (builder) => ({
        getPosts: builder.query({
            query: ({ page = 1, limit = 10, sort = 'date', order = 'desc', status, categories, dateFrom, dateTo, search,} = {}) => {
                const params = {page, limit, sort, order};
                if (status) {
                    params.status = status;
                }
                if (Array.isArray(categories) && categories.length > 0) {
                    params.categories = categories.join(',');
                }
                if (dateFrom) {
                    params.date_from = dateFrom;
                }
                if (dateTo) {
                    params.date_to = dateTo;
                }
                if (search) {
                    params.search = search;
                }
                return `/api/posts?${new URLSearchParams(params).toString()}`;
            }
        }),
    }),
});
export const { useGetPostsQuery } = postsApi;
