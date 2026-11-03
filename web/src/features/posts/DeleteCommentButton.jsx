import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../auth/authSlice";
import { useDeleteCommentMutation } from "./postsApi";

export function DeleteCommentButton({ comment, onDeleted }) {
  const currentUser = useSelector(selectCurrentUser);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const cancelButtonRef = useRef(null);
  const [deleteComment, { isLoading }] = useDeleteCommentMutation();
  const canDelete =
    currentUser?.role === "admin" ||
    String(currentUser?.id) === String(comment.author_id);

  useEffect(() => {
    if (!isConfirming) return undefined;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isLoading) {
        setIsConfirming(false);
        setErrorMessage("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConfirming, isLoading]);

  if (!canDelete) return null;

  const handleDelete = async () => {
    setErrorMessage("");
    try {
      await deleteComment(comment.id).unwrap();
      setIsConfirming(false);
      await onDeleted?.();
    } catch (error) {
      setErrorMessage(
        error?.data?.message ||
          "Could not delete this comment. Please try again.",
      );
    }
  };

  return (
    <>
      <button
        type="button"
        className="comment-delete-button"
        aria-label="Delete comment"
        title="Delete comment"
        onClick={() => {
          setErrorMessage("");
          setIsConfirming(true);
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          focusable="false"
        >
          <path
            d="M4.5 7h15M9 7V4.75h6V7m2.5 0-.8 12.25H7.3L6.5 7m3.25 3.25v5.5m4.5-5.5v5.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {isConfirming && (
        <div className="comment-delete-dialog__backdrop">
          <section
            className="comment-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-comment-title-${comment.id}`}
            aria-describedby={`delete-comment-description-${comment.id}`}
          >
            <div className="comment-delete-dialog__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" focusable="false">
                <path
                  d="M4.5 7h15M9 7V4.75h6V7m2.5 0-.8 12.25H7.3L6.5 7m3.25 3.25v5.5m4.5-5.5v5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 id={`delete-comment-title-${comment.id}`}>
              Delete this comment?
            </h2>
            <p id={`delete-comment-description-${comment.id}`}>
              This action cannot be undone. Replies to this comment, if any,
              will also be deleted.
            </p>
            {errorMessage && (
              <p className="comment-delete-dialog__error" role="alert">
                {errorMessage}
              </p>
            )}
            <div className="comment-delete-dialog__actions">
              <button
                ref={cancelButtonRef}
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsConfirming(false);
                  setErrorMessage("");
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="comment-delete-dialog__confirm"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete comment"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
