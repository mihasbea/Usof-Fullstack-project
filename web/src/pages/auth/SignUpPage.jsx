import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSignUpUserMutation } from "../../features/auth/authApi";
import { AuthLayout } from "../../components/layout/AuthLayout";

export function SignUpPage() {
  const navigate = useNavigate();
  const [signUpUser, { isLoading }] = useSignUpUserMutation();
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      login: String(formData.get("login") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      full_name: String(formData.get("full_name") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      password_confirmation: String(
        formData.get("password_confirmation") ?? "",
      ),
    };

    try {
      await signUpUser(payload).unwrap();
      navigate("/check-email", { state: { email: payload.email } });
    } catch (error) {
      setErrorMessage(
        error?.data?.message ||
          "Could not create your account. Please try again.",
      );
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card auth-card--signup">
        <h1>Create your account</h1>
        <p className="auth-description">
          Share what you know. Learn something new.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {errorMessage && (
            <p role="alert" className="error-message">
              {errorMessage}
            </p>
          )}

          <label>
            Full name
            <input
              name="full_name"
              type="text"
              placeholder="Your full name"
              autoComplete="name"
              required
              disabled={isLoading}
            />
          </label>

          <label>
            Login
            <input
              name="login"
              type="text"
              placeholder="Choose a username"
              autoComplete="username"
              required
              disabled={isLoading}
            />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={isLoading}
            />
          </label>

          <label>
            Password Confirmation
            <input
              name="password_confirmation"
              type="password"
              placeholder="Enter your password again"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={isLoading}
            />
          </label>

          <button
            type="submit"
            className="btn btn-primary wide"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
