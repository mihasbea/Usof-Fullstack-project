import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useSelector } from "react-redux";
import { BackChevron } from "../../components/layout/BackChevron";
import { selectCurrentUser } from "../../features/auth/authSlice";
import {
  useGetCategoriesQuery,
  useGetPostByIdQuery,
  useUpdatePostMutation,
} from "../../features/posts/postsApi";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function EditPostCategoriesPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusCategories = searchParams.get("focus") === "categories";
  const currentUser = useSelector(selectCurrentUser);
  const [selectedIds, setSelectedIds] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const {
    data: post,
    isLoading: postLoading,
    isError: postError,
  } = useGetPostByIdQuery(postId);
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useGetCategoriesQuery();
  const [updatePost, { isLoading: isSaving }] = useUpdatePostMutation();
  const suggestedIds = useMemo(
    () =>
      new Set(
        (searchParams.get("suggested") ?? "")
          .split(",")
          .filter(Boolean)
          .map(String),
      ),
    [searchParams],
  );
  const originalIds = (post?.categories ?? []).map((category) =>
    String(category.id),
  );
  const sortedOriginalIds = [...originalIds].sort();
  const sortedSelectedIds = [...selectedIds].sort();
  const hasChanges =
    sortedOriginalIds.length !== sortedSelectedIds.length ||
    sortedOriginalIds.some((id, index) => id !== sortedSelectedIds[index]);
  const canEdit =
    post &&
    (String(post.author_id) === String(currentUser?.id) ||
      currentUser?.role === "admin");
  const filteredCategories = categories.filter((category) => {
    const query = categorySearch.trim().toLocaleLowerCase();
    return (
      !query ||
      category.title.toLocaleLowerCase().includes(query) ||
      (category.description ?? "").toLocaleLowerCase().includes(query)
    );
  });
  const selectedCategories = selectedIds
    .map((id) => categories.find((category) => String(category.id) === id))
    .filter(Boolean);

  useEffect(() => {
    if (post) {
      setSelectedIds(
        (post.categories ?? []).map((category) => String(category.id)),
      );
    }
  }, [post]);

  useEffect(() => {
    if (!post || categoriesLoading || !focusCategories) return undefined;
    const timeout = window.setTimeout(() => {
      document
        .getElementById("post-categories-editor")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [post, categoriesLoading, focusCategories]);

  const toggleCategory = (categoryId) => {
    const id = String(categoryId);
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((selectedId) => selectedId !== id)
        : [...previous, id],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    if (selectedIds.length === 0) {
      setErrorMessage("Choose at least one category for this post.");
      return;
    }

    try {
      await updatePost({
        postId,
        changes: { categories: selectedIds.join(",") },
      }).unwrap();
      navigate(`/posts/${postId}`, { replace: true });
    } catch (error) {
      setErrorMessage(
        error?.data?.message || "Could not update the post categories.",
      );
    }
  };

  if (postLoading || categoriesLoading) {
    return (
      <section className="page-block edit-categories-loading" aria-busy="true">
        <p role="status">Loading post and categories...</p>
      </section>
    );
  }

  if (postError || !post) {
    return (
      <section className="page-block edit-categories-error">
        <h1>Post unavailable</h1>
        <p role="alert">Could not load this post.</p>
        <Link to="/profile?tab=posts" className="btn btn-secondary">
          Back to your posts
        </Link>
      </section>
    );
  }

  if (!canEdit) {
    return (
      <section className="page-block edit-categories-error">
        <h1>Access unavailable</h1>
        <p role="alert">
          Only the post author or an admin can change its categories.
        </p>
        <Link to={`/posts/${postId}`} className="btn btn-secondary">
          View post
        </Link>
      </section>
    );
  }

  return (
    <section className="page-block edit-categories-page">
      <Link to={`/posts/${postId}`} className="post-back-link">
        <BackChevron /> Back to post
      </Link>

      <header className="edit-categories-heading">
        <div>
          <h1>Update categories</h1>
          <p>Choose the topics that best help people discover this post.</p>
        </div>
        <span className="edit-categories-count" aria-live="polite">
          <strong>{selectedIds.length}</strong>
          {selectedIds.length === 1
            ? "category selected"
            : "categories selected"}
        </span>
      </header>

      <article className="edit-categories-post">
        <div className="edit-categories-post__top">
          <Link to={`/posts/${postId}`}>Open post →</Link>
        </div>
        <h2>
          <Link to={`/posts/${postId}`}>{post.title}</Link>
        </h2>
        <div className="edit-categories-post__meta">
          <Link to={`/users/${post.author_id}`}>@{post.author_login}</Link>
          {post.created_at && <time>{formatDate(post.created_at)}</time>}
        </div>
        <p className="edit-categories-post__excerpt">
          {post.content?.trim() || "This post has no text content."}
        </p>
        <div className="edit-categories-post__topics">
          <span>Selected topics</span>
          {selectedCategories.length > 0 ? (
            <div className="edit-categories-selected">
              {selectedCategories.map((category) => (
                <span className="edit-categories-chip" key={category.id}>
                  {category.title}
                </span>
              ))}
            </div>
          ) : (
            <small>No categories selected yet</small>
          )}
        </div>
      </article>

      <form className="edit-categories-form" onSubmit={handleSubmit}>
        <div className="edit-categories-form__heading">
          <div>
            <h2>Choose categories</h2>
            <p>
              {suggestedIds.size > 0
                ? "Suggested topics are highlighted. Select or clear any topics to fit your post."
                : "Select one or more topics that describe your post."}
            </p>
          </div>
          <label className="edit-categories-search">
            <span className="sr-only">Search categories</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="10.8" cy="10.8" r="6.3" />
              <path d="m15.5 15.5 4 4" />
            </svg>
            <input
              type="search"
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
              placeholder="Find a category"
            />
          </label>
        </div>

        {categoriesError ? (
          <div className="edit-categories-inline-error">
            <p role="alert">Categories could not be loaded.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={refetchCategories}
            >
              Try again
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <p className="edit-categories-no-results">
            No categories match “{categorySearch}”.
          </p>
        ) : (
          <fieldset
            id="post-categories-editor"
            className="edit-categories-grid"
          >
            <legend className="sr-only">Available categories</legend>
            {filteredCategories.map((category) => {
              const isSelected = selectedIds.includes(String(category.id));
              const isSuggested = suggestedIds.has(String(category.id));
              return (
                <button
                  type="button"
                  key={category.id}
                  className={`edit-category-option${isSelected ? " is-selected" : ""}${isSuggested ? " is-suggested" : ""}`}
                  aria-pressed={isSelected}
                  onClick={() => toggleCategory(category.id)}
                  disabled={isSaving}
                >
                  <span
                    className="edit-category-option__check"
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <svg viewBox="0 0 20 20" focusable="false">
                        <path d="m4 10 4 4 8-8" />
                      </svg>
                    )}
                  </span>
                  <span className="edit-category-option__copy">
                    <strong>{category.title}</strong>
                    <small>
                      {category.description || "Explore posts in this topic"}
                    </small>
                  </span>
                  {isSuggested && (
                    <span className="edit-category-option__suggested">
                      Suggested
                    </span>
                  )}
                </button>
              );
            })}
          </fieldset>
        )}

        {errorMessage && (
          <p className="error-message" role="alert">
            {errorMessage}
          </p>
        )}
        <footer className="edit-categories-actions">
          <span>
            {hasChanges
              ? "Your changes are not saved yet."
              : "Categories match the current post."}
          </span>
          <div>
            <Link to={`/posts/${postId}`} className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving || !hasChanges || categoriesError}
            >
              {isSaving ? "Saving..." : "Save categories"}
            </button>
          </div>
        </footer>
      </form>
    </section>
  );
}
