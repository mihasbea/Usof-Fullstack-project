import { Link } from "react-router-dom";
import { PostRating } from "./PostRating";
import { PostAttachments } from "./PostAttachments";
import { AuthorFollowButton, SavePostButton } from "./PostActions";

function getExcerpt(content, maxLength = 280) {
  const text = content?.trim() ?? "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}…`;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PostPreview({ post }) {
  const comment = post.top_comment;
  const initial = (post.author_login ?? "?").charAt(0).toUpperCase();
  const apiUrl = process.env.REACT_APP_API_URL ?? "http://localhost:3000";
  const avatarUrl = post.author_profile_picture
    ? new URL(post.author_profile_picture, apiUrl).toString()
    : null;

  return (
    <article className="post-preview">
      <SavePostButton post={post} compact />
      <div className="post-preview-votes">
        <PostRating post={post} />
      </div>

      <div className="post-preview-body">
        <header className="post-preview-meta">
          <span className="post-preview-avatar" aria-hidden="true">
            {initial}
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt=""
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
              />
            )}
          </span>
          <Link to={`/users/${post.author_id}`} className="post-preview-author">
            {post.author_login}
          </Link>
          <AuthorFollowButton post={post} compact />
          <span className="post-preview-dot" aria-hidden="true">
            ·
          </span>
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        </header>

        {post.categories?.length > 0 && (
          <div className="post-preview-categories">
            {post.categories.map((category) => (
              <span className="post-category-tag" key={category.id}>
                {category.title}
              </span>
            ))}
          </div>
        )}

        <div className="post-preview-title-row">
          <h3 className="post-preview-title">
            <Link to={`/posts/${post.id}`} className="post-preview-link">
              {post.title}
            </Link>
          </h3>
        </div>

        <p className="post-preview-excerpt">{getExcerpt(post.content)}</p>

        <PostAttachments
          attachments={post.attachments}
          limit={4}
          asLinks={false}
        />
        <div className={`post-preview-comment${comment ? "" : " is-empty"}`}>
          {comment ? (
            <>
              <p>{getExcerpt(comment.content, 160)}</p>
              <span className="post-preview-comment__meta">
                <strong>{comment.author_login}</strong>
                <span>· {comment.likes_count} likes</span>
              </span>
            </>
          ) : (
            <span>No comments yet. Be the first to join the discussion.</span>
          )}
        </div>

        <span className="post-preview-read-more">Read full post →</span>
      </div>
    </article>
  );
}
