import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const profileApi = createApi({
    reducerPath: 'profileApi',
    tagTypes: ['Profile', 'UserPosts', 'UserComments', 'UserCategories'],
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.REACT_APP_API_URL ?? 'http://localhost:3000',
        prepareHeaders: (headers, { getState }) => {
            const token = getState().auth.token;
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    endpoints: (builder) => ({
        getProfile: builder.query({
            query: (userId) => `/api/users/${userId}`,
            providesTags: (_result, _error, userId) => [
                { type: 'Profile', id: userId },
            ],
        }),
        updateProfile: builder.mutation({
            query: ({ userId, changes }) => ({
                url: `/api/users/${userId}`,
                method: 'PATCH',
                body: changes,
            }),
            invalidatesTags: (_result, _error, { userId }) => [
                { type: 'Profile', id: userId },
            ],
        }),
        uploadAvatar: builder.mutation({
            query: (formData) => ({
                url: '/api/users/avatar',
                method: 'PATCH',
                body: formData,
            }),
            invalidatesTags: ['Profile'],
        }),
        getUserPosts: builder.query({
            query: ({ userId, page = 1, limit = 10 }) =>
                `/api/users/${userId}/posts?page=${page}&limit=${limit}&sort=date&order=desc`,
            providesTags: (_result, _error, { userId }) => [
                { type: 'UserPosts', id: userId },
            ],
        }),
        getUserComments: builder.query({
            query: ({ userId, page = 1, limit = 10 }) =>
                `/api/users/${userId}/comments?page=${page}&limit=${limit}`,
            providesTags: (_result, _error, { userId }) => [
                { type: 'UserComments', id: userId },
            ],
        }),
        getUserCategories: builder.query({
            query: (userId) => `/api/users/${userId}/categories`,
            providesTags: (_result, _error, userId) => [
                { type: 'UserCategories', id: userId },
            ],
        }),
        createCategory: builder.mutation({
            query: (category) => ({
                url: '/api/categories',
                method: 'POST',
                body: category,
            }),
            invalidatesTags: ['UserCategories'],
        }),
        updateCategory: builder.mutation({
            query: ({ categoryId, changes }) => ({
                url: `/api/categories/${categoryId}`,
                method: 'PATCH',
                body: changes,
            }),
            invalidatesTags: ['UserCategories', 'UserPosts'],
        }),
        deleteCategory: builder.mutation({
            query: (categoryId) => ({
                url: `/api/categories/${categoryId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['UserCategories', 'UserPosts'],
        }),
    }),
});

export const {
    useCreateCategoryMutation,
    useDeleteCategoryMutation,
    useGetProfileQuery,
    useGetUserCategoriesQuery,
    useGetUserCommentsQuery,
    useGetUserPostsQuery,
    useUpdateCategoryMutation,
    useUpdateProfileMutation,
    useUploadAvatarMutation,
} = profileApi;
