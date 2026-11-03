import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const profileApi = createApi({
  reducerPath: "profileApi",
  tagTypes: [
    "Profile",
    "UserPosts",
    "UserComments",
    "UserCategories",
    "UserDirectory",
    "UserFollowers",
  ],
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_URL ?? "http://localhost:3000",
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getProfile: builder.query({
      query: (argument) => {
        const userId =
          typeof argument === "object" ? argument.userId : argument;
        const includeAllPosts =
          typeof argument === "object" && argument.includeAllPosts;
        return `/api/users/${userId}${includeAllPosts ? "?include_all_posts=true" : ""}`;
      },
      providesTags: (_result, _error, argument) => [
        {
          type: "Profile",
          id: typeof argument === "object" ? argument.userId : argument,
        },
      ],
    }),
    getUserDirectory: builder.query({
      query: ({ page = 1, limit = 20, search = "" } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search.trim()) params.set("search", search.trim());
        return `/api/users/directory?${params.toString()}`;
      },
      providesTags: ["UserDirectory"],
    }),
    getUserFollowers: builder.query({
      query: ({ userId, page = 1, limit = 20 }) =>
        `/api/users/${userId}/followers?page=${page}&limit=${limit}`,
      providesTags: (_result, _error, { userId }) => [
        { type: "UserFollowers", id: userId },
      ],
    }),
    updateProfile: builder.mutation({
      query: ({ userId, changes }) => ({
        url: `/api/users/${userId}`,
        method: "PATCH",
        body: changes,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "Profile", id: userId },
      ],
    }),
    uploadAvatar: builder.mutation({
      query: (argument) => {
        const userId =
          argument instanceof FormData ? undefined : argument.userId;
        const formData =
          argument instanceof FormData ? argument : argument.formData;
        return {
          url: userId ? `/api/users/${userId}/avatar` : "/api/users/avatar",
          method: "PATCH",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, argument) => [
        argument instanceof FormData
          ? "Profile"
          : { type: "Profile", id: argument.userId },
        "UserDirectory",
      ],
    }),
    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `/api/users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "Profile",
        "UserPosts",
        "UserComments",
        "UserCategories",
        "UserFollowers",
        "UserDirectory",
      ],
    }),
    getUserPosts: builder.query({
      query: ({
        userId,
        page = 1,
        limit = 10,
        status,
        sort = "date",
        order = "desc",
        allAuthors = false,
      }) => {
        const params = new URLSearchParams({
          page,
          limit,
          sort,
          order,
        });
        if (status) params.set("status", status);
        if (allAuthors) params.set("all_authors", "true");
        return `/api/users/${userId}/posts?${params.toString()}`;
      },
      providesTags: (_result, _error, { userId }) => [
        { type: "UserPosts", id: userId },
      ],
    }),
    getUserComments: builder.query({
      query: ({ userId, page = 1, limit = 10 }) =>
        `/api/users/${userId}/comments?page=${page}&limit=${limit}`,
      providesTags: (_result, _error, { userId }) => [
        { type: "UserComments", id: userId },
      ],
    }),
    getUserCategories: builder.query({
      query: (userId) => `/api/users/${userId}/categories`,
      providesTags: (_result, _error, userId) => [
        { type: "UserCategories", id: userId },
      ],
    }),
    createCategory: builder.mutation({
      query: (category) => ({
        url: "/api/categories",
        method: "POST",
        body: category,
      }),
      invalidatesTags: ["UserCategories"],
    }),
    updateCategory: builder.mutation({
      query: ({ categoryId, changes }) => ({
        url: `/api/categories/${categoryId}`,
        method: "PATCH",
        body: changes,
      }),
      invalidatesTags: ["UserCategories", "UserPosts"],
    }),
    deleteCategory: builder.mutation({
      query: (categoryId) => ({
        url: `/api/categories/${categoryId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["UserCategories", "UserPosts"],
    }),
  }),
});

export const {
  useCreateCategoryMutation,
  useDeleteUserMutation,
  useDeleteCategoryMutation,
  useGetProfileQuery,
  useGetUserDirectoryQuery,
  useGetUserFollowersQuery,
  useGetUserCategoriesQuery,
  useGetUserCommentsQuery,
  useGetUserPostsQuery,
  useUpdateCategoryMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} = profileApi;
