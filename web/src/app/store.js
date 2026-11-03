import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { authApi } from "../features/auth/authApi";
import { postsApi } from "../features/posts/postsApi";
import { profileApi } from "../features/profile/profileApi";
import { notificationsApi } from "../features/notifications/notificationsApi";
import authReducer, {
  logout,
  setCredentials,
} from "../features/auth/authSlice";
import { clearPersistedAuth, persistAuth } from "../features/auth/authStorage";

const authPersistenceMiddleware = (storeApi) => (next) => (action) => {
  const result = next(action);

  if (setCredentials.match(action)) {
    persistAuth(storeApi.getState().auth);
  } else if (logout.match(action)) {
    clearPersistedAuth();
  }

  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [postsApi.reducerPath]: postsApi.reducer,
    [profileApi.reducerPath]: profileApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authPersistenceMiddleware,
      authApi.middleware,
      postsApi.middleware,
      profileApi.middleware,
      notificationsApi.middleware,
    ),
});

setupListeners(store.dispatch);
