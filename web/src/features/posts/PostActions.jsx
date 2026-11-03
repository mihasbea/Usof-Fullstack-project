import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { selectCurrentUser, selectIsAuthenticated } from "../auth/authSlice";
import {
  useAddFavoriteMutation,
  useFollowUserMutation,
  useRemoveFavoriteMutation,
  useSubscribeToCategoryMutation,
  useSubscribeToPostMutation,
  useUnfollowUserMutation,
  useUnsubscribeFromCategoryMutation,
  useUnsubscribeFromPostMutation,
} from "./postsApi";

function messageFrom(error) {
  return (
    error?.data?.message || "Could not save this change. Please try again."
  );
}

export function SavePostButton({ post, compact = false }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [errorMessage, setErrorMessage] = useState("");
  const [addFavorite, { isLoading: isSaving }] = useAddFavoriteMutation();
  const [removeFavorite, { isLoading: isRemoving }] =
    useRemoveFavoriteMutation();
  const isSaved = Boolean(post.is_favorite);

  const toggleSaved = async () => {
    setErrorMessage("");
    try {
      await (isSaved ? removeFavorite(post.id) : addFavorite(post.id)).unwrap();
    } catch (error) {
      setErrorMessage(messageFrom(error));
    }
  };

  return (
    <span className="post-save-control">
      <button
        type="button"
        className={`post-save-button${isSaved ? " is-active" : ""}${compact ? " is-compact" : ""}`}
        aria-label={isSaved ? "Remove post from saved" : "Save post"}
        aria-pressed={isSaved}
        title={
          !isAuthenticated
            ? "Log in to save this post"
            : isSaved
              ? "Remove from saved"
              : "Save post"
        }
        disabled={!isAuthenticated || isSaving || isRemoving}
        onClick={toggleSaved}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          focusable="false"
          className="post-save-button__icon"
        >
          <path d="M6 3.75h12a1 1 0 0 1 1 1v16l-7-4.25-7 4.25v-16a1 1 0 0 1 1-1Z" />
        </svg>
        {!compact && <span>{isSaved ? "Saved" : "Save"}</span>}
      </button>
      {errorMessage && (
        <span className="post-actions__error" role="alert">
          {errorMessage}
        </span>
      )}
    </span>
  );
}

export function AuthorFollowButton({
  post,
  author,
  compact = false,
  onFollowChange,
}) {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [errorMessage, setErrorMessage] = useState("");
  const [followUser, { isLoading: isFollowing }] = useFollowUserMutation();
  const [unfollowUser, { isLoading: isUnfollowing }] =
    useUnfollowUserMutation();
  const authorId = author?.id ?? post?.author_id;
  const authorLogin = author?.login ?? post?.author_login;
  const isFollowingAuthor = Boolean(
    author?.is_following ?? post?.is_author_subscribed,
  );
  const [following, setFollowing] = useState(isFollowingAuthor);

  useEffect(() => {
    setFollowing(isFollowingAuthor);
  }, [isFollowingAuthor]);

  if (!authorId || String(authorId) === String(user?.id)) return null;

  const toggleFollow = async () => {
    setErrorMessage("");
    try {
      await (
        following ? unfollowUser(authorId) : followUser(authorId)
      ).unwrap();
      setFollowing(!following);
      onFollowChange?.();
    } catch (error) {
      setErrorMessage(messageFrom(error));
    }
  };

  return (
    <span className="post-follow-control">
      <button
        type="button"
        className={`post-follow-button${following ? " is-active" : ""}${compact ? " is-compact" : ""}`}
        aria-pressed={following}
        disabled={!isAuthenticated || isFollowing || isUnfollowing}
        title={
          !isAuthenticated
            ? "Log in to follow this author"
            : following
              ? `Unfollow ${authorLogin}`
              : `Follow ${authorLogin}`
        }
        onClick={toggleFollow}
      >
        {!following && <span aria-hidden="true">+</span>}
        <span>{following ? "Following" : "Follow"}</span>
      </button>
      {errorMessage && (
        <span className="post-actions__error" role="alert">
          {errorMessage}
        </span>
      )}
    </span>
  );
}

export function PostActions({
  post,
  showSubscriptions = true,
  showAuthorFollow = true,
  compact = false,
}) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [errorMessage, setErrorMessage] = useState("");
  const [subscribeToPost, { isLoading: isSubscribingPost }] =
    useSubscribeToPostMutation();
  const [unsubscribeFromPost, { isLoading: isUnsubscribingPost }] =
    useUnsubscribeFromPostMutation();
  const [subscribeToCategory, { isLoading: isSubscribingCategory }] =
    useSubscribeToCategoryMutation();
  const [unsubscribeFromCategory, { isLoading: isUnsubscribingCategory }] =
    useUnsubscribeFromCategoryMutation();

  const runAction = async (action) => {
    setErrorMessage("");
    try {
      await action().unwrap();
    } catch (error) {
      setErrorMessage(messageFrom(error));
    }
  };

  const disabled =
    isSubscribingPost ||
    isUnsubscribingPost ||
    isSubscribingCategory ||
    isUnsubscribingCategory;

  return (
    <div className={`post-actions${compact ? " post-actions--compact" : ""}`}>
      <div className="post-actions__buttons">
        <SavePostButton post={post} />
        {showAuthorFollow && <AuthorFollowButton post={post} />}
        {showSubscriptions && (
          <button
            type="button"
            className={`post-action${post.is_subscribed ? " is-active" : ""}`}
            aria-pressed={Boolean(post.is_subscribed)}
            disabled={!isAuthenticated || disabled}
            onClick={() =>
              runAction(() =>
                post.is_subscribed
                  ? unsubscribeFromPost(post.id)
                  : subscribeToPost(post.id),
              )
            }
            title={
              post.is_subscribed
                ? "Stop notifications for this post"
                : "Get notifications about this post"
            }
          >
            {post.is_subscribed ? "Following discussion" : "Follow discussion"}
          </button>
        )}
      </div>

      {showSubscriptions && post.categories?.length > 0 && (
        <div className="post-actions__topics" aria-label="Follow post topics">
          {post.categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={`post-topic-action${category.is_subscribed ? " is-active" : ""}`}
              aria-pressed={Boolean(category.is_subscribed)}
              disabled={!isAuthenticated || disabled}
              onClick={() =>
                runAction(() =>
                  category.is_subscribed
                    ? unsubscribeFromCategory(category.id)
                    : subscribeToCategory(category.id),
                )
              }
            >
              {!category.is_subscribed && <span aria-hidden="true">+</span>}
              {category.is_subscribed ? "Following" : "Follow"} {category.title}
            </button>
          ))}
        </div>
      )}

      {!isAuthenticated && (
        <p className="post-actions__signin">
          <Link to="/login" state={{ from: `/posts/${post.id}` }}>
            Log in
          </Link>{" "}
          to follow this discussion or its topics.
        </p>
      )}
      {errorMessage && (
        <p className="post-actions__error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
