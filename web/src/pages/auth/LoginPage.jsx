import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginUserMutation } from '../../features/auth/authApi';
import { setCredentials } from '../../features/auth/authSlice';

export function LoginPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loginUser, { isLoading }] = useLoginUserMutation();

    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage('');

        const form = event.currentTarget;
        const formData = new FormData(form);
        const loginOrEmail = String(formData.get('loginOrEmail') ?? '').trim();
        const password = String(formData.get('password') ?? '');

        if (!loginOrEmail || !password) {
            setErrorMessage('Please enter both login/email and password.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmail = emailRegex.test(loginOrEmail);

        const credentials = isEmail
            ? { email: loginOrEmail, password }
            : { login: loginOrEmail, password };

        try {
            const data = await loginUser(credentials).unwrap();

            dispatch(setCredentials({
                user: data.user,
                token: data.token,
            }));
            navigate('/');
        } catch (err) {
            const backendError = err?.data?.message || 'Invalid login or password.';
            setErrorMessage(backendError);
        }
    };

    return (
        <div className="auth-shell">
            <div className="auth-card">
                <h1>Welcome back</h1>
                <p>Sign in to continue to your feed.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {errorMessage && (
                        <p role="alert" className="error-message" style={{ color: '#e53e3e', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            {errorMessage}
                        </p>
                    )}

                    <label>
                        Login or Email
                        <input
                            name="loginOrEmail"
                            type="text"
                            placeholder="your login or email"
                            autoComplete="username"
                            disabled={isLoading}
                            required
                        />
                    </label>

                    <label>
                        Password
                        <input
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            disabled={isLoading}
                            required
                        />
                    </label>

                    <button type="submit" className="btn btn-primary wide" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Log in'}
                    </button>
                </form>

                <p className="auth-link">
                    Don&apos;t have an account? <Link to="/signup">Create one</Link>
                </p>
            </div>
        </div>
    );
}