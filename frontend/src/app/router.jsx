import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { SignUpPage } from '../pages/auth/SignUpPage';
import { MainPage } from '../pages/main/MainPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
import { selectIsAuthenticated } from '../features/auth/authSlice';
function PublicRoute() {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    return isAuthenticated ? <Navigate to="/" replace/> : <Outlet />;
}
function ProtectedRoute() {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace/>;
}
export const appRouter = createBrowserRouter([
    {
        element: <PublicRoute />,
        children: [
            {
                path: '/login',
                element: <LoginPage />,
            },
            {
                path: '/signup',
                element: <SignUpPage />,
            },
        ],
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: '/',
                element: <AppLayout />,
                children: [
                    {
                        index: true,
                        element: <MainPage />,
                    },
                    {
                        path: 'profile',
                        element: <ProfilePage />,
                    },
                    {
                        path: 'notifications',
                        element: <NotificationsPage />,
                    },
                ],
            },
        ],
    },
]);
