import { Link, useParams } from "react-router-dom";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { useConfirmEmailQuery } from "../../features/auth/authApi";

export function EmailConfirmationPage() {
  const { token } = useParams();
  const confirmationQuery = useConfirmEmailQuery(token);
  const errorMessage =
    confirmationQuery.error?.data?.message ||
    "We could not confirm this email address. The link may be invalid or expired.";

  return (
    <AuthLayout>
      <section
        className={`auth-card verification-card email-confirmation-card${confirmationQuery.isError ? " is-error" : ""}`}
        aria-live="polite"
      >
        {confirmationQuery.isLoading ? (
          <>
            <span className="verification-icon is-loading" aria-hidden="true">
              <span />
            </span>
            <h1>Confirming your email</h1>
            <p>Please wait while we verify your email address.</p>
          </>
        ) : confirmationQuery.isSuccess ? (
          <>
            <h1>Email confirmed!</h1>
            <p>
              Your email address is verified. You can now sign in and join the
              discussion.
            </p>
            <Link className="btn btn-primary wide" to="/login">
              Continue to login
            </Link>
          </>
        ) : (
          <>
            <span className="verification-icon is-error" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 7l10 10M17 7 7 17"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <h1>Confirmation link unavailable</h1>
            <p role="alert">{errorMessage}</p>
            <button
              className="btn btn-secondary wide"
              type="button"
              onClick={confirmationQuery.refetch}
            >
              Try again
            </button>
            <Link className="verification-back-link" to="/signup">
              Create an account
            </Link>
          </>
        )}
      </section>
    </AuthLayout>
  );
}
