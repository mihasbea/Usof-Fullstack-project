import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginUserMutation } from '../../features/auth/authApi';
import { setCredentials } from '../../features/auth/authSlice';
export function LoginPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loginUser, { isLoading }] = useLoginUserMutation();
    const handleSubmit = async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const email = String(formData.get('email') ?? '');
        const password = String(formData.get('password') ?? '');
        const result = await loginUser({ email, password });
        if ('data' in result && result.data) {
            dispatch(setCredentials({
                user: result.data.user,
                token: result.data.token,
            }));
            navigate('/');
        }
    };
    return (<div className="auth-shell">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p>Sign in to continue to your feed.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input name="email" type="email" placeholder="user@example.com"/>
          </label>

          <label>
            Password
            <input name="password" type="password" placeholder="••••••••"/>
          </label>

          <button type="submit" className="btn btn-primary wide" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="auth-link">
          Don&apos;t have an account? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>);
}
