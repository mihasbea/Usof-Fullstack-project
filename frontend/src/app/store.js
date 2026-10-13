import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../features/auth/authApi';
import { postsApi } from '../features/posts/postsApi';
import { profileApi } from '../features/profile/profileApi';
import { notificationsApi } from '../features/notifications/notificationsApi';
import authReducer from '../features/auth/authSlice';
export const store = configureStore({
    reducer: {
        auth: authReducer,
        [authApi.reducerPath]: authApi.reducer,
        [postsApi.reducerPath]: postsApi.reducer,
        [profileApi.reducerPath]: profileApi.reducer,
        [notificationsApi.reducerPath]: notificationsApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(authApi.middleware, postsApi.middleware, profileApi.middleware, notificationsApi.middleware),
});
