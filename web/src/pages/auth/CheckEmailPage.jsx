import { Link, useLocation } from "react-router-dom";
import { AuthLayout } from "../../components/layout/AuthLayout";

export function CheckEmailPage() {
  const { state } = useLocation();
  const email = state?.email;

  return (
    <AuthLayout>
      <section className="auth-card verification-card">
        <h1>Check Your Email</h1>
        <p>
          {email
            ? `We've sent a confirmation link to ${email}. Please check your inbox and click the link to verify your email address.`
            : "Please check your inbox and click the link to verify your email address."}
        </p>
        <p>If you don't see the email, please check your spam folder.</p>
        <Link className="btn btn-primary wide" to="/login">
          Back to login
        </Link>
      </section>
    </AuthLayout>
  );
}
