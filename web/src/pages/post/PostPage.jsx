import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { BackChevron } from "../../components/layout/BackChevron";
import {
  selectCurrentUser,
  selectIsAuthenticated,
} from "../../features/auth/authSlice";
import { PostAttachments } from "../../features/posts/PostAttachments";
import { PostRating } from "../../features/posts/PostRating";
import {
  AuthorFollowButton,
  PostActions,
} from "../../features/posts/PostActions";
import { PostComment } from "../../features/posts/PostComment";
import {
  useAddPostCommentMutation,
  useGetPostByIdQuery,
  useGetPostCommentsQuery,
} from "../../features/posts/postsApi";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function organizeComments(comments) {
  const commentById = new Map(
    comments.map((comment) => [
      String(comment.id),
      { ...comment, replies: [] },
    ]),
  );
  const roots = [];

  for (const comment of commentById.values()) {
    const parent = comment.parent_comment_id
      ? commentById.get(String(comment.parent_comment_id))
      : null;
    if (parent) {
      parent.replies.push(comment);
    } else {
      roots.push(comment);
    }
  }

  return roots;
}

export function PostPage() {
  const { postId } = useParams();
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const [commentError, setCommentError] = useState("");
  const {
    data: post,
    isLoading,
    isError,
    refetch,
  } = useGetPostByIdQuery(postId, {
    pollingInterval: 5000,
    skipPollingIfUnfocused: true,
  });
  const {
    data: comments = [],
    isLoading: commentsLoading,
    isError: commentsError,
    refetch: refetchComments,
  } = useGetPostCommentsQuery(postId, {
    pollingInterval: 5000,
    skipPollingIfUnfocused: true,
  });
  const [addPostComment, { isLoading: isSubmitting }] =
    useAddPostCommentMutation();

  useEffect(() => {
    if (commentsLoading || !location.hash) return undefined;
    const timeout = window.setTimeout(() => {
      document
        .getElementById(decodeURIComponent(location.hash.slice(1)))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [comments, commentsLoading, location.hash]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCommentError("");
    const form = event.currentTarget;
    const content = String(new FormData(form).get("content") ?? "").trim();
    if (!content) {
      setCommentError("Please enter a comment before posting.");
      return;
    }

    try {
      await addPostComment({ postId, content }).unwrap();
      form.reset();
    } catch (error) {
      setCommentError(
        error?.data?.message || "Could not add your comment. Please try again.",
      );
    }
  };

  if (isLoading) {
    return (
      <section className="page-block post-detail-loading" aria-busy="true">
        <p role="status">Loading post...</p>
      </section>
    );
  }

  if (isError || !post) {
    return (
      <section className="page-block post-detail-error">
        <p role="alert">Could not load this post.</p>
        <button type="button" className="btn btn-secondary" onClick={refetch}>
          Try again
        </button>
        <Link to="/">Back to the main page</Link>
      </section>
    );
  }

  const commentTree = organizeComments(comments);
  const authorInitial = (post.author_login || "?").charAt(0).toUpperCase();
  const apiUrl = process.env.REACT_APP_API_URL ?? "http://localhost:3000";
  const authorAvatarUrl = post.author_profile_picture
    ? new URL(post.author_profile_picture, apiUrl).toString()
    : null;

  return (
    <main className="page-block post-detail">
      <Link to="/" className="post-back-link">
        <BackChevron /> Back to the feed
      </Link>

      <article className="post-detail-card">
        <header className="post-detail-header">
          {post.categories?.length > 0 && (
            <div className="post-category-list">
              {post.categories.map((category) => (
                <span className="post-category-tag" key={category.id}>
                  {category.title}
                </span>
              ))}
            </div>
          )}
          <h1>{post.title}</h1>
          <div className="post-detail-author">
            <span className="post-detail-avatar" aria-hidden="true">
              {authorInitial}
              {authorAvatarUrl && (
                <img
                  src={authorAvatarUrl}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                  }}
                />
              )}
            </span>
            <div className="post-detail-author__copy">
              <div className="post-detail-author__identity">
                <Link to={`/users/${post.author_id}`}>
                  <strong>{post.author_login}</strong>
                </Link>
                <AuthorFollowButton post={post} compact />
              </div>
              <span>
                <time dateTime={post.created_at}>
                  {formatDate(post.created_at)}
                </time>
                {post.updated_at !== post.created_at && (
                  <> · Edited {formatDate(post.updated_at)}</>
                )}
              </span>
            </div>
          </div>
        </header>

        <div className="post-detail-content">{post.content}</div>
        <PostAttachments attachments={post.attachments} />

        <footer className="post-detail-toolbar">
          <PostRating post={post} pollForUpdates />
          <PostActions post={post} showAuthorFollow={false} />
        </footer>
      </article>

      <section className="post-comments" aria-labelledby="comments-heading">
        <header className="post-comments__header">
          <div>
            <h2 id="comments-heading">Discussion</h2>
          </div>
          <span className="post-comments__count">
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </span>
        </header>

        {isAuthenticated ? (
          <form className="post-comment-form" onSubmit={handleSubmit}>
            <label htmlFor="post-comment-content">Join the conversation</label>
            <textarea
              id="post-comment-content"
              name="content"
              rows="4"
              maxLength="1000"
              placeholder="Share a thoughtful response..."
              required
              disabled={isSubmitting}
            />
            {commentError && (
              <p className="error-message" role="alert">
                {commentError}
              </p>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Posting..." : "Comment"}
            </button>
          </form>
        ) : (
          <div className="post-comment-signin">
            <p>Join the conversation with the community.</p>
            <Link
              to="/login"
              className="btn btn-primary"
              state={{ from: `/posts/${postId}` }}
            >
              Log in to comment
            </Link>
          </div>
        )}

        {commentsLoading ? (
          <p className="post-comments__status" role="status">
            Loading comments...
          </p>
        ) : commentsError ? (
          <div className="post-comments__error">
            <p role="alert">Could not load comments.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={refetchComments}
            >
              Try again
            </button>
          </div>
        ) : commentTree.length > 0 ? (
          <div className="post-comments-list">
            {commentTree.map((comment) => (
              <PostComment
                key={comment.id}
                comment={comment}
                replies={comment.replies}
                postId={postId}
                currentUser={currentUser}
              />
            ))}
          </div>
        ) : (
          <div className="post-comments__empty">
            <h3>Start the discussion</h3>
            <p>Be the first to share a helpful response.</p>
          </div>
        )}
      </section>
    </main>
  );
}
