import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { useSelector } from "react-redux";
import { AppLayout } from "../components/layout/AppLayout";
import { CheckEmailPage } from "../pages/auth/CheckEmailPage";
import { EmailConfirmationPage } from "../pages/auth/EmailConfirmationPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { SignUpPage } from "../pages/auth/SignUpPage";
import { MainPage } from "../pages/main/MainPage";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { PublicProfilePage } from "../pages/profile/PublicProfilePage";
import { AuthorsPage } from "../pages/profile/AuthorsPage";
import { NotificationsPage } from "../pages/notifications/NotificationsPage";
import { CategoriesPage } from "../pages/categories/CategoriesPage";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import { CreatePostPage } from "../pages/post/CreatePostPage";
import { PostPage } from "../pages/post/PostPage";
import { EditPostCategoriesPage } from "../pages/post/EditPostCategoriesPage";

function PublicRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();
  return isAuthenticated ? (
    <Navigate to={location.state?.from ?? "/"} replace />
  ) : (
    <Outlet />
  );
}

function ProtectedRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();
  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
}

export const appRouter = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/signup",
        element: <SignUpPage />,
      },
      {
        path: "/check-email",
        element: <CheckEmailPage />,
      },
    ],
  },
  {
    path: "/email-confirmation/:token",
    element: <EmailConfirmationPage />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <MainPage />,
      },
      {
        path: "authors",
        element: <AuthorsPage />,
      },
      {
        path: "categories",
        element: <CategoriesPage />,
      },
      {
        path: "users/:userId",
        element: <PublicProfilePage />,
      },
      {
        path: "posts/:postId",
        element: <PostPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "posts/new",
            element: <CreatePostPage />,
          },
          {
            path: "posts/:postId/edit",
            element: <EditPostCategoriesPage />,
          },
          {
            path: "profile",
            element: <ProfilePage />,
          },
          {
            path: "notifications",
            element: <NotificationsPage />,
          },
        ],
      },
    ],
  },
]);
