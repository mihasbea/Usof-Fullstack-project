import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { selectCurrentUser, selectIsAuthenticated } from "../auth/authSlice";
import {
  useAddCommentLikeMutation,
  useAddPostCommentMutation,
  useRemoveCommentLikeMutation,
  useUpdateCommentMutation,
} from "./postsApi";
import { DeleteCommentButton } from "./DeleteCommentButton";
import { VoteButton } from "./VoteButton";

function formatCommentDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PostComment({
  comment,
  replies = [],
  postId,
  postTitle,
  currentUser: suppliedCurrentUser,
  depth = 0,
}) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authenticatedUser = useSelector(selectCurrentUser);
  const currentUser = suppliedCurrentUser ?? authenticatedUser;
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [errorMessage, setErrorMessage] = useState("");
  const [addLike, { isLoading: isLiking }] = useAddCommentLikeMutation();
  const [removeLike, { isLoading: isRemovingLike }] =
    useRemoveCommentLikeMutation();
  const [addComment, { isLoading: isReplying }] = useAddPostCommentMutation();
  const [updateComment, { isLoading: isUpdating }] = useUpdateCommentMutation();
  const isAuthor = String(currentUser?.id) === String(comment.author_id);
  const currentReaction = comment.is_liked
    ? "like"
    : comment.is_disliked
      ? "dislike"
      : null;
  const initial = (comment.author_login || "?").charAt(0).toUpperCase();

  const handleReaction = async (type) => {
    setErrorMessage("");
    try {
      if (currentReaction === type) {
        await removeLike(comment.id).unwrap();
      } else {
        await addLike({ commentId: comment.id, type }).unwrap();
      }
    } catch (error) {
      setErrorMessage(
        error?.data?.message || "Could not update your reaction.",
      );
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    const form = event.currentTarget;
    const content = String(new FormData(form).get("content") ?? "").trim();
    if (!content) {
      setErrorMessage("Write a reply before posting.");
      return;
    }
    try {
      await addComment({
        postId,
        content,
        parentCommentId: comment.id,
      }).unwrap();
      form.reset();
      setReplyOpen(false);
    } catch (error) {
      setErrorMessage(
        error?.data?.message || "Could not add your reply. Please try again.",
      );
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    try {
      await updateComment({
        commentId: comment.id,
        content: editedContent.trim(),
      }).unwrap();
      setEditOpen(false);
    } catch (error) {
      setErrorMessage(
        error?.data?.message ||
          "Could not update your comment. Please try again.",
      );
    }
  };

  return (
    <article
      className={`post-comment${depth > 0 ? " post-comment--reply" : ""}`}
      id={`comment-${comment.id}`}
    >
      <div className="post-comment__avatar" aria-hidden="true">
        {initial}
      </div>
      <div className="post-comment__body">
        <header className="post-comment__header">
          <Link to={`/users/${comment.author_id}`}>
            <strong>{comment.author_login}</strong>
          </Link>
          <span aria-hidden="true">·</span>
          <time dateTime={comment.created_at}>
            {formatCommentDate(comment.created_at)}
          </time>
        </header>
        {editOpen ? (
          <form className="post-comment__edit-form" onSubmit={handleUpdate}>
            <label
              className="visually-hidden"
              htmlFor={`edit-comment-${comment.id}`}
            >
              Edit your comment
            </label>
            <textarea
              id={`edit-comment-${comment.id}`}
              value={editedContent}
              onChange={(event) => setEditedContent(event.target.value)}
              rows="4"
              maxLength="10000"
              required
              disabled={isUpdating}
              autoFocus
            />
            <div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditedContent(comment.content);
                  setEditOpen(false);
                }}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isUpdating || !editedContent.trim()}
              >
                {isUpdating ? "Saving..." : "Save comment"}
              </button>
            </div>
          </form>
        ) : (
          <p className="post-comment__content">{comment.content}</p>
        )}
        {postTitle && !editOpen && (
          <Link
            className="post-comment__post-link"
            to={`/posts/${postId}#comment-${comment.id}`}
          >
            In: {postTitle}
          </Link>
        )}
        <div className="post-comment__actions">
          <div
            className="post-comment__rating"
            role="group"
            aria-label="Rate this comment"
          >
            <VoteButton
              type="like"
              active={currentReaction === "like"}
              count={comment.likes_count ?? 0}
              disabled={!isAuthenticated || isLiking || isRemovingLike}
              onClick={() => handleReaction("like")}
            />
            <VoteButton
              type="dislike"
              active={currentReaction === "dislike"}
              count={comment.dislikes_count ?? 0}
              disabled={!isAuthenticated || isLiking || isRemovingLike}
              onClick={() => handleReaction("dislike")}
            />
          </div>
          {isAuthor && !editOpen && (
            <button
              type="button"
              className="post-comment__action"
              onClick={() => {
                setEditedContent(comment.content);
                setEditOpen(true);
                setReplyOpen(false);
              }}
            >
              Edit
            </button>
          )}
          {!editOpen && <DeleteCommentButton comment={comment} />}
          {isAuthenticated && !editOpen ? (
            <button
              type="button"
              className="post-comment__action"
              aria-expanded={replyOpen}
              onClick={() => setReplyOpen((open) => !open)}
            >
              Reply
            </button>
          ) : !isAuthenticated ? (
            <Link
              className="post-comment__action"
              to="/login"
              state={{ from: `/posts/${postId}` }}
            >
              Log in to reply
            </Link>
          ) : null}
        </div>

        {errorMessage && (
          <p className="post-comment__error" role="alert">
            {errorMessage}
          </p>
        )}

        {replyOpen && (
          <form className="post-comment__reply-form" onSubmit={handleReply}>
            <label className="visually-hidden" htmlFor={`reply-${comment.id}`}>
              Reply to {comment.author_login}
            </label>
            <textarea
              id={`reply-${comment.id}`}
              name="content"
              rows="3"
              maxLength="1000"
              placeholder={`Reply to ${comment.author_login}...`}
              required
              disabled={isReplying}
              autoFocus
            />
            <div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReplyOpen(false)}
                disabled={isReplying}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isReplying}
              >
                {isReplying ? "Replying..." : "Reply"}
              </button>
            </div>
          </form>
        )}

        {replies.length > 0 && (
          <div className="post-comment__replies">
            {replies.map((reply) => (
              <PostComment
                key={reply.id}
                comment={reply}
                replies={reply.replies}
                postId={postId}
                postTitle={postTitle}
                currentUser={currentUser}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
