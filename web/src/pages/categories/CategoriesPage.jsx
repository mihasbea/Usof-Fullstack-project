import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  selectCurrentUser,
  selectIsAuthenticated,
} from "../../features/auth/authSlice";
import {
  useGetSubscribedCategoriesQuery,
  useSearchCategoriesQuery,
  useSubscribeToCategoryMutation,
  useUnsubscribeFromCategoryMutation,
} from "../../features/posts/postsApi";

const PAGE_SIZE = 16;

export function CategoriesPage() {
  const currentUser = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [searchDraft, setSearchDraft] = useState("");
  const [creatorDraft, setCreatorDraft] = useState("");
  const [search, setSearch] = useState("");
  const [creator, setCreator] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [sort, setSort] = useState("title");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState("");

  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useSearchCategoriesQuery({
    search,
    creator,
    creatorId: mineOnly ? currentUser?.id : undefined,
    sort,
    page,
    limit: PAGE_SIZE,
  });
  const { data: subscribedCategories = [] } = useGetSubscribedCategoriesQuery(
    undefined,
    { skip: !isAuthenticated },
  );
  const [subscribe, { isLoading: isSubscribing }] =
    useSubscribeToCategoryMutation();
  const [unsubscribe, { isLoading: isUnsubscribing }] =
    useUnsubscribeFromCategoryMutation();

  const categories = response?.data ?? [];
  const pagination = response?.pagination;
  const subscribedIds = new Set(
    subscribedCategories.map((category) => String(category.id)),
  );

  const handleSearch = (event) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setCreator(creatorDraft.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setSearchDraft("");
    setCreatorDraft("");
    setSearch("");
    setCreator("");
    setMineOnly(false);
    setSort("title");
    setPage(1);
  };

  const toggleSubscription = async (category) => {
    setActionError("");
    try {
      if (subscribedIds.has(String(category.id))) {
        await unsubscribe(category.id).unwrap();
      } else {
        await subscribe(category.id).unwrap();
      }
    } catch (mutationError) {
      setActionError(
        mutationError?.data?.message ||
          "Could not update this category subscription.",
      );
    }
  };

  return (
    <section
      className="page-block categories-page"
      aria-labelledby="categories-title"
    >
      <header className="categories-header">
        <div>
          <h1 id="categories-title">Explore categories</h1>
          <p>
            Find topics by name or creator, then follow the ones you care about.
          </p>
        </div>
        {isAuthenticated && (
          <Link className="btn btn-secondary" to="/profile?tab=categories">
            Manage my categories
          </Link>
        )}
      </header>

      <form className="categories-toolbar" onSubmit={handleSearch}>
        <label>
          <span>Search categories</span>
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            maxLength={255}
            placeholder="Name or description"
          />
        </label>
        <label>
          <span>Created by</span>
          <input
            type="search"
            value={creatorDraft}
            onChange={(event) => setCreatorDraft(event.target.value)}
            maxLength={255}
            placeholder="Author name or username"
            disabled={mineOnly}
          />
        </label>
        <label className="categories-sort">
          <span>Sort by</span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
          >
            <option value="title">Name</option>
            <option value="popular">Most posts</option>
            <option value="newest">Recently created</option>
          </select>
        </label>
        {isAuthenticated && (
          <label className="categories-mine-filter">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(event) => {
                setMineOnly(event.target.checked);
                setCreatorDraft("");
                setCreator("");
                setPage(1);
              }}
            />
            <span>Created by me</span>
          </label>
        )}
        <div className="categories-toolbar__actions">
          <button type="submit" className="btn btn-primary">
            Apply filters
          </button>
          {(search || creator || mineOnly || sort !== "title") && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearFilters}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {actionError && (
        <p className="error-message" role="alert">
          {actionError}
        </p>
      )}

      <div className="categories-results-heading">
        <h2>All categories</h2>
        {Number.isInteger(pagination?.total_categories) && (
          <span>{pagination.total_categories} topics</span>
        )}
      </div>

      {isLoading ? (
        <p role="status">Loading categories...</p>
      ) : isError ? (
        <div className="public-profile-error">
          <p role="alert">
            {error?.data?.message || "Categories could not be loaded."}
          </p>
          <button type="button" className="btn btn-secondary" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="public-profile-empty">
          <h2>No categories found</h2>
          <p>Try a different title or creator, or clear your filters.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div
            className={`categories-grid${isFetching ? " is-fetching" : ""}`}
            aria-busy={isFetching}
          >
            {categories.map((category) => {
              const isMine =
                String(currentUser?.id) === String(category.created_by);
              const isFollowing = subscribedIds.has(String(category.id));
              const creatorName =
                category.creator_full_name ||
                category.creator_login ||
                "USOF community";
              return (
                <article className="directory-category-card" key={category.id}>
                  <div className="directory-category-card__top">
                    <Link
                      className="directory-category-card__title"
                      to={`/?category=${category.id}`}
                    >
                      {category.title}
                    </Link>
                    <span className="directory-category-card__count">
                      {category.posts_count ?? 0} posts
                    </span>
                  </div>
                  <p className="directory-category-card__description">
                    {category.description || "No description added."}
                  </p>
                  <p className="directory-category-card__creator">
                    Created by{" "}
                    {category.created_by ? (
                      <Link to={`/users/${category.created_by}`}>
                        {creatorName}
                      </Link>
                    ) : (
                      creatorName
                    )}
                    {category.creator_login && (
                      <span> @{category.creator_login}</span>
                    )}
                  </p>
                  <div className="directory-category-card__actions">
                    <Link
                      className="btn btn-secondary"
                      to={`/?category=${category.id}`}
                    >
                      Browse posts
                    </Link>
                    {isMine ? (
                      <Link
                        className="directory-category-card__manage"
                        to="/profile?tab=categories"
                      >
                        Manage
                      </Link>
                    ) : isAuthenticated ? (
                      <button
                        type="button"
                        className={`category-subscribe-button${isFollowing ? " is-active" : ""}`}
                        aria-pressed={isFollowing}
                        disabled={isSubscribing || isUnsubscribing}
                        onClick={() => toggleSubscription(category)}
                      >
                        {isFollowing ? "Following" : "+ Follow"}
                      </button>
                    ) : (
                      <Link
                        className="category-subscribe-button"
                        to="/login"
                        state={{ from: "/categories" }}
                      >
                        + Follow
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {pagination?.total_pages > 1 && (
            <nav
              className="public-profile-pagination"
              aria-label="Category pages"
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {pagination.total_pages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page >= pagination.total_pages || isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
