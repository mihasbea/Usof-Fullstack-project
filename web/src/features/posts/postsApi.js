import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
export const postsApi = createApi({
  reducerPath: "postsApi",
  tagTypes: [
    "Post",
    "PostList",
    "PostComments",
    "PostLikes",
    "Categories",
    "Favorites",
    "Subscriptions",
    "FollowingUsers",
  ],
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
    getCategories: builder.query({
      query: () => "/api/categories",
      providesTags: ["Categories"],
    }),
    searchCategories: builder.query({
      query: ({
        search = "",
        creator = "",
        creatorId,
        sort = "title",
        page = 1,
        limit = 20,
      } = {}) => {
        const params = new URLSearchParams({
          search,
          creator,
          sort,
          page,
          limit,
        });
        if (creatorId) params.set("creator_id", creatorId);
        return `/api/categories/search?${params.toString()}`;
      },
      providesTags: ["Categories"],
    }),
    getPosts: builder.query({
      query: ({
        page = 1,
        limit = 10,
        sort = "date",
        order = "desc",
        status,
        categories,
        dateFrom,
        dateTo,
        search,
      } = {}) => {
        const params = { page, limit, sort, order };
        if (status) {
          params.status = status;
        }
        if (Array.isArray(categories) && categories.length > 0) {
          params.categories = categories.join(",");
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
        { type: "PostList", id: "LIST" },
        ...(result?.data ?? []).map(({ id }) => ({ type: "Post", id })),
      ],
    }),
    searchComments: builder.query({
      query: ({ search, page = 1, limit = 10 }) => {
        const params = new URLSearchParams({ search, page, limit });
        return `/api/comments/search?${params.toString()}`;
      },
      providesTags: ["PostComments"],
    }),
    addCommentLike: builder.mutation({
      query: ({ commentId, type = "like" }) => ({
        url: `/api/comments/${commentId}/like`,
        method: "POST",
        body: { type },
      }),
      invalidatesTags: (_result, _error, { commentId }) => [
        { type: "PostLikes", id: `comment-${commentId}` },
        "PostComments",
      ],
    }),
    removeCommentLike: builder.mutation({
      query: (commentId) => ({
        url: `/api/comments/${commentId}/like`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, commentId) => [
        { type: "PostLikes", id: `comment-${commentId}` },
        "PostComments",
      ],
    }),
    getFavoritePosts: builder.query({
      query: ({ page = 1, limit = 10 } = {}) =>
        `/api/favorites?page=${page}&limit=${limit}&sort=date&order=desc`,
      providesTags: [
        { type: "Favorites", id: "LIST" },
        { type: "PostList", id: "LIST" },
      ],
    }),
    getSubscribedPosts: builder.query({
      query: ({ page = 1, limit = 10 } = {}) =>
        `/api/subscriptions/posts?page=${page}&limit=${limit}&sort=date&order=desc`,
      providesTags: [
        { type: "Subscriptions", id: "POSTS" },
        { type: "PostList", id: "LIST" },
      ],
    }),
    getSubscribedCategories: builder.query({
      query: () => "/api/subscriptions/categories",
      providesTags: ["Subscriptions"],
    }),
    getFollowedUsers: builder.query({
      query: ({ page = 1, limit = 20 } = {}) =>
        `/api/subscriptions/users?page=${page}&limit=${limit}`,
      providesTags: ["FollowingUsers"],
    }),
    addFavorite: builder.mutation({
      query: (postId) => ({
        url: `/api/posts/${postId}/favorite`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, postId) => [
        { type: "Post", id: postId },
        { type: "PostList", id: "LIST" },
        { type: "Favorites", id: "LIST" },
      ],
    }),
    removeFavorite: builder.mutation({
      query: (postId) => ({
        url: `/api/posts/${postId}/favorite`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, postId) => [
        { type: "Post", id: postId },
        { type: "PostList", id: "LIST" },
        { type: "Favorites", id: "LIST" },
      ],
    }),
    subscribeToPost: builder.mutation({
      query: (postId) => ({
        url: `/api/posts/${postId}/subscription`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, postId) => [
        { type: "Post", id: postId },
        { type: "PostList", id: "LIST" },
        { type: "Subscriptions", id: "POSTS" },
      ],
    }),
    unsubscribeFromPost: builder.mutation({
      query: (postId) => ({
        url: `/api/posts/${postId}/subscription`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, postId) => [
        { type: "Post", id: postId },
        { type: "PostList", id: "LIST" },
        { type: "Subscriptions", id: "POSTS" },
      ],
    }),
    subscribeToCategory: builder.mutation({
      query: (categoryId) => ({
        url: `/api/categories/${categoryId}/subscription`,
        method: "POST",
      }),
      invalidatesTags: ["Categories", "Subscriptions", "Post"],
    }),
    unsubscribeFromCategory: builder.mutation({
      query: (categoryId) => ({
        url: `/api/categories/${categoryId}/subscription`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories", "Subscriptions", "Post"],
    }),
    followUser: builder.mutation({
      query: (userId) => ({
        url: `/api/users/${userId}/subscription`,
        method: "POST",
      }),
      invalidatesTags: () => [
        "FollowingUsers",
        { type: "PostList", id: "LIST" },
        "Post",
      ],
    }),
    unfollowUser: builder.mutation({
      query: (userId) => ({
        url: `/api/users/${userId}/subscription`,
        method: "DELETE",
      }),
      invalidatesTags: () => [
        "FollowingUsers",
        { type: "PostList", id: "LIST" },
        "Post",
      ],
    }),
    getPostById: builder.query({
      query: (postId) => `/api/posts/${postId}`,
      providesTags: (_result, _error, postId) => [{ type: "Post", id: postId }],
    }),
    getPostComments: builder.query({
      query: (postId) => `/api/posts/${postId}/comments`,
      providesTags: (_result, _error, postId) => [
        { type: "PostComments", id: postId },
      ],
    }),
    getPostLikes: builder.query({
      query: (postId) => `/api/posts/${postId}/like`,
      providesTags: (_result, _error, postId) => [
        { type: "PostLikes", id: postId },
      ],
    }),
    addPostLike: builder.mutation({
      query: ({ postId, type }) => ({
        url: `/api/posts/${postId}/like`,
        method: "POST",
        body: { type },
      }),
      invalidatesTags: (_result, _error, { postId }) => [
        { type: "Post", id: postId },
        { type: "PostList", id: "LIST" },
        { type: "PostLikes", id: postId },
      ],
    }),
    addPostComment: builder.mutation({
      query: ({ postId, content, parentCommentId }) => ({
        url: `/api/posts/${postId}/comments`,
        method: "POST",
        body: {
          content,
          ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
        },
      }),
      invalidatesTags: (_result, _error, { postId }) => [
        { type: "PostComments", id: postId },
      ],
    }),
    updateComment: builder.mutation({
      query: ({ commentId, content }) => ({
        url: `/api/comments/${commentId}`,
        method: "PATCH",
        body: { content },
      }),
      invalidatesTags: ["PostComments"],
    }),
    deleteComment: builder.mutation({
      query: (commentId) => ({
        url: `/api/comments/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PostComments", { type: "PostList", id: "LIST" }],
    }),
    createPost: builder.mutation({
      query: (formData) => ({
        url: "/api/posts",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "PostList", id: "LIST" }],
    }),
    updatePost: builder.mutation({
      query: ({ postId, changes }) => ({
        url: `/api/posts/${postId}`,
        method: "PATCH",
        body: changes,
      }),
      invalidatesTags: (_result, _error, { postId }) => [
        { type: "Post", id: postId },
        { type: "PostList", id: "LIST" },
      ],
    }),
    deletePost: builder.mutation({
      query: (postId) => ({
        url: `/api/posts/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, postId) => [
        { type: "Post", id: postId },
        { type: "PostList", id: "LIST" },
      ],
    }),
  }),
});
export const {
  useAddPostCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useAddPostLikeMutation,
  useAddCommentLikeMutation,
  useRemoveCommentLikeMutation,
  useGetCategoriesQuery,
  useSearchCommentsQuery,
  useSearchCategoriesQuery,
  useGetFavoritePostsQuery,
  useGetSubscribedPostsQuery,
  useGetSubscribedCategoriesQuery,
  useGetFollowedUsersQuery,
  useGetPostByIdQuery,
  useGetPostCommentsQuery,
  useGetPostLikesQuery,
  useGetPostsQuery,
  useCreatePostMutation,
  useDeletePostMutation,
  useUpdatePostMutation,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  useSubscribeToPostMutation,
  useUnsubscribeFromPostMutation,
  useSubscribeToCategoryMutation,
  useUnsubscribeFromCategoryMutation,
  useFollowUserMutation,
  useUnfollowUserMutation,
} = postsApi;
