import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useSignUpUserMutation } from '../../features/auth/authApi';
import { setCredentials } from '../../features/auth/authSlice';
export function SignUpPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [signUpUser, { isLoading }] = useSignUpUserMutation();
    const handleSubmit = async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const payload = {
            login: String(formData.get('login') ?? ''),
            email: String(formData.get('email') ?? ''),
            password: String(formData.get('password') ?? ''),
        };
        const result = await signUpUser(payload);
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
        <h1>Create account</h1>
        <p>Join the platform and start engaging.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input name="login" type="text" placeholder="Jane Doe"/>
          </label>

          <label>
            Email
            <input name="email" type="email" placeholder="jane@example.com"/>
          </label>

          <label>
            Password
            <input name="password" type="password" placeholder="At least 8 characters"/>
          </label>

          <button type="submit" className="btn btn-primary wide" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>);
}
