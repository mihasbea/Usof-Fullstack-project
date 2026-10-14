export function useAuthGuard() {
    return {
        isAuthenticated: true,
        user: {
            id: 1,
            login: 'mmykhalchenko',
            role: 'user',
        },
    };
}
