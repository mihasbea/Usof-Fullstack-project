import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
export const postsApi = createApi({
    reducerPath: 'postsApi',
    tagTypes: ['Post', 'PostList', 'PostComments', 'PostLikes', 'Categories'],
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.REACT_APP_API_URL ?? 'http://localhost:3000',
        prepareHeaders: (headers, { getState }) => {
            const token = getState().auth.token;
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    endpoints: (builder) => ({
        getCategories: builder.query({
            query: () => '/api/categories',
            providesTags: ['Categories'],
        }),
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
            },
            providesTags: (result) => [
                { type: 'PostList', id: 'LIST' },
                ...(result?.data ?? []).map(({ id }) => ({ type: 'Post', id })),
            ],
        }),
        getPostById: builder.query({
            query: (postId) => `/api/posts/${postId}`,
            providesTags: (_result, _error, postId) => [{ type: 'Post', id: postId }],
        }),
        getPostComments: builder.query({
            query: (postId) => `/api/posts/${postId}/comments`,
            providesTags: (_result, _error, postId) => [{ type: 'PostComments', id: postId }],
        }),
        getPostLikes: builder.query({
            query: (postId) => `/api/posts/${postId}/like`,
            providesTags: (_result, _error, postId) => [{ type: 'PostLikes', id: postId }],
        }),
        addPostLike: builder.mutation({
            query: ({ postId, type }) => ({
                url: `/api/posts/${postId}/like`,
                method: 'POST',
                body: { type },
            }),
            invalidatesTags: (_result, _error, { postId }) => [
                { type: 'Post', id: postId },
                { type: 'PostList', id: 'LIST' },
                { type: 'PostLikes', id: postId },
            ],
        }),
        addPostComment: builder.mutation({
            query: ({ postId, content }) => ({
                url: `/api/posts/${postId}/comments`,
                method: 'POST',
                body: { content },
            }),
            invalidatesTags: (_result, _error, { postId }) => [
                { type: 'PostComments', id: postId },
            ],
        }),
        createPost: builder.mutation({
            query: (formData) => ({
                url: '/api/posts',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: [{ type: 'PostList', id: 'LIST' }],
        }),
        updatePost: builder.mutation({
            query: ({ postId, changes }) => ({
                url: `/api/posts/${postId}`,
                method: 'PATCH',
                body: changes,
            }),
            invalidatesTags: (_result, _error, { postId }) => [
                { type: 'Post', id: postId },
                { type: 'PostList', id: 'LIST' },
            ],
        }),
    }),
});
export const {
    useAddPostCommentMutation,
    useAddPostLikeMutation,
    useGetCategoriesQuery,
    useGetPostByIdQuery,
    useGetPostCommentsQuery,
    useGetPostLikesQuery,
    useGetPostsQuery,
    useCreatePostMutation,
    useUpdatePostMutation,
} = postsApi;
