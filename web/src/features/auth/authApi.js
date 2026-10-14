import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
export const authApi = createApi({
    reducerPath: 'authApi',
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
        loginUser: builder.mutation({
            query: (credentials) => ({
                url: '/api/auth/login',
                method: 'POST',
                body: credentials,
            }),
        }),
        signUpUser: builder.mutation({
            query: (payload) => ({
                url: '/api/auth/signup',
                method: 'POST',
                body: payload,
            }),
        }),
    }),
});
export const { useLoginUserMutation, useSignUpUserMutation } = authApi;
