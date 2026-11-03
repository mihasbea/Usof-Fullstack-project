import { createSlice } from "@reduxjs/toolkit";
import { loadPersistedAuth } from "./authStorage";

const persistedAuth = loadPersistedAuth();
const initialState = {
  user: persistedAuth?.user ?? null,
  token: persistedAuth?.token ?? null,
  isAuthenticated: Boolean(persistedAuth),
};
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});
export const { setCredentials, logout } = authSlice.actions;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectCurrentUser = (state) => state.auth.user;
export default authSlice.reducer;
