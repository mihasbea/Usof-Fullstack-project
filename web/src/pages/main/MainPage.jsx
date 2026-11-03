import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthorFollowButton } from "../../features/posts/PostActions";
import { PostPreview } from "../../features/posts/PostPreview";
import {
  useGetCategoriesQuery,
  useGetPostsQuery,
  useSearchCommentsQuery,
  useSearchCategoriesQuery,
} from "../../features/posts/postsApi";
import { PostComment } from "../../features/posts/PostComment";
import { useGetUserDirectoryQuery } from "../../features/profile/profileApi";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { id: "date_desc", label: "Newest first", sort: "date", order: "desc" },
  { id: "date_asc", label: "Oldest first", sort: "date", order: "asc" },
  { id: "likes_desc", label: "Most liked", sort: "likes", order: "desc" },
  { id: "likes_asc", label: "Least liked", sort: "likes", order: "asc" },
];

function SearchPagination({ page, pagination, onChange, isFetching }) {
  if (!pagination || pagination.total_pages <= 1) return null;

  return (
    <nav className="public-profile-pagination" aria-label="Search results">
      <button
        type="button"
        className="btn btn-secondary"
        disabled={page <= 1 || isFetching}
        onClick={() => onChange(page - 1)}
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
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

export function MainPage() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortId, setSortId] = useState("date_desc");
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search")?.trim() ?? "";
  const requestedType = searchParams.get("type");
  const type = ["users", "categories"].includes(requestedType)
    ? requestedType
    : "posts";
  const { sort, order } = SORT_OPTIONS.find((option) => option.id === sortId);

  useEffect(() => {
    setPage(1);
  }, [search, type]);

  useEffect(() => {
    setSelectedCategory(searchParams.get("category") ?? "");
  }, [searchParams]);

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useGetCategoriesQuery(undefined, { skip: type !== "posts" });
  const {
    data: response,
    isLoading: postsLoading,
    isError: postsError,
    isFetching: postsFetching,
  } = useGetPostsQuery(
    {
      categories: selectedCategory ? [selectedCategory] : undefined,
      status: "active",
      sort,
      order,
      search,
      page,
      limit: PAGE_SIZE,
    },
    {
      skip: type !== "posts",
      pollingInterval: 10000,
      skipPollingIfUnfocused: true,
    },
  );
  const {
    data: searchCommentsResponse,
    isLoading: searchCommentsLoading,
    isError: searchCommentsError,
    isFetching: searchCommentsFetching,
  } = useSearchCommentsQuery(
    { search, page, limit: PAGE_SIZE },
    {
      skip: type !== "posts" || !search,
      pollingInterval: 10000,
      skipPollingIfUnfocused: true,
    },
  );
  const {
    data: usersResponse,
    isLoading: usersLoading,
    isError: usersError,
    isFetching: usersFetching,
  } = useGetUserDirectoryQuery(
    { search, page, limit: 20 },
    { skip: type !== "users" },
  );
  const {
    data: categoriesResponse,
    isLoading: searchCategoriesLoading,
    isError: searchCategoriesError,
    isFetching: searchCategoriesFetching,
  } = useSearchCategoriesQuery(
    { search, page, limit: 20 },
    { skip: type !== "categories" },
  );

  const posts = response?.data ?? [];
  const postsPagination = response?.pagination ?? {};
  const postsTotalPages =
    postsPagination.total_pages ??
    Math.max(1, Math.ceil((postsPagination.total_posts ?? 0) / PAGE_SIZE));
  const matchingComments = searchCommentsResponse?.data ?? [];
  const commentPagination = searchCommentsResponse?.pagination;
  const combinedTotalPages = Math.max(
    postsTotalPages,
    commentPagination?.total_pages ?? 1,
  );
  const users = usersResponse?.data ?? [];
  const userPagination = usersResponse?.pagination;
  const matchedCategories = categoriesResponse?.data ?? [];
  const categoryPagination = categoriesResponse?.pagination;

  const chooseCategory = (id) => {
    setSelectedCategory(id);
    setPage(1);
  };
  const chooseSort = (id) => {
    setSortId(id);
    setPage(1);
  };
  const goToPage = (next) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const browseCategory = (id) => {
    setSelectedCategory(String(id));
    setPage(1);
    setSearchParams({ category: String(id) });
  };

  return (
    <section className="page-block">
      {type === "posts" ? (
        <div className="feed-top">
          <div className="feed-top__filters">
            <section
              className="category-section"
              aria-label="Browse posts by category"
            >
              <h3>Explore topics</h3>
              {categoriesLoading ? (
                <p className="category-status">Loading categories...</p>
              ) : categoriesError ? (
                <p className="category-status" role="alert">
                  Could not load categories.
                </p>
              ) : (
                <div className="category-filter-list">
                  <button
                    type="button"
                    className={`category-filter${selectedCategory ? "" : " active"}`}
                    aria-pressed={!selectedCategory}
                    onClick={() => chooseCategory("")}
                  >
                    All posts
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={`category-filter${selectedCategory === String(category.id) ? " active" : ""}`}
                      aria-pressed={selectedCategory === String(category.id)}
                      onClick={() => chooseCategory(String(category.id))}
                    >
                      {category.title}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="category-section" aria-label="Sort posts">
              <h3>Sort by</h3>
              <div className="category-filter-list">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`category-filter${sortId === option.id ? " active" : ""}`}
                    aria-pressed={sortId === option.id}
                    onClick={() => chooseSort(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <Link to="/posts/new" className="create-post-btn">
            <svg
              className="create-post-btn__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="create-post-btn__label">Create post</span>
          </Link>
        </div>
      ) : (
        <header className="search-results-heading">
          <h1>
            {type === "users" ? "People" : "Categories"}
            {search && <span> for “{search}”</span>}
          </h1>
          <p>
            {type === "users"
              ? "Find community members and explore their profiles."
              : "Find topics by name or by the person who created them."}
          </p>
        </header>
      )}

      {type === "posts" &&
        (postsLoading ? (
          <p>Loading posts...</p>
        ) : postsError ? (
          <p role="alert">Could not load posts.</p>
        ) : (
          <>
            <div
              className="feed-list"
              style={{ opacity: postsFetching ? 0.6 : 1 }}
            >
              {posts.length === 0 ? (
                <p className="feed-empty">
                  {search
                    ? "No posts matched your search. Matching comments appear below."
                    : "No posts in this topic yet."}
                </p>
              ) : (
                posts.map((post) => <PostPreview key={post.id} post={post} />)
              )}
            </div>

            {search && (
              <section className="search-matching-comments">
                <h2>Matching comments</h2>
                {searchCommentsLoading ? (
                  <p role="status">Loading matching comments...</p>
                ) : searchCommentsError ? (
                  <p role="alert">
                    Could not load matching comments. Please try again.
                  </p>
                ) : matchingComments.length === 0 ? (
                  <p className="feed-empty">No comments matched your search.</p>
                ) : (
                  <div
                    className="post-comments-list"
                    style={{
                      opacity: searchCommentsFetching ? 0.6 : 1,
                    }}
                  >
                    {matchingComments.map((comment) => (
                      <PostComment
                        key={comment.id}
                        comment={comment}
                        postId={comment.post_id}
                        postTitle={comment.post_title}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {combinedTotalPages > 1 && (
              <nav className="feed-pagination" aria-label="Pagination">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={
                    page <= 1 || postsFetching || searchCommentsFetching
                  }
                  onClick={() => goToPage(page - 1)}
                >
                  ← Previous
                </button>
                <span>
                  Page {page} of {combinedTotalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={
                    page >= combinedTotalPages ||
                    postsFetching ||
                    searchCommentsFetching
                  }
                  onClick={() => goToPage(page + 1)}
                >
                  Next →
                </button>
              </nav>
            )}
          </>
        ))}

      {type === "users" &&
        (usersLoading ? (
          <p role="status">Searching users...</p>
        ) : usersError ? (
          <p role="alert">Could not search users. Please try again.</p>
        ) : users.length === 0 ? (
          <p className="feed-empty">No users matched your search.</p>
        ) : (
          <>
            <div
              className={`authors-grid${usersFetching ? " is-fetching" : ""}`}
            >
              {users.map((author) => {
                const avatarInitial = (author.full_name || author.login || "?")
                  .charAt(0)
                  .toUpperCase();
                const apiUrl =
                  process.env.REACT_APP_API_URL ?? "http://localhost:3000";
                const avatarUrl = author.profile_picture
                  ? new URL(author.profile_picture, apiUrl).toString()
                  : null;

                return (
                  <article className="author-card" key={author.id}>
                    <Link
                      to={`/users/${author.id}`}
                      className="author-card__identity"
                    >
                      <span className="author-card__avatar">
                        {avatarInitial}
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
                      <span className="author-card__name">
                        <strong>{author.full_name || author.login}</strong>
                        <small>@{author.login}</small>
                      </span>
                    </Link>
                    <div className="author-card__stats">
                      <span>
                        <strong>{author.post_count ?? 0}</strong> posts
                      </span>
                      <span>
                        <strong>{author.follower_count ?? 0}</strong> followers
                      </span>
                      <span>
                        <strong>{author.rating ?? 0}</strong> reputation
                      </span>
                    </div>
                    <div className="author-card__footer">
                      <Link to={`/users/${author.id}`}>View profile</Link>
                      <AuthorFollowButton author={author} compact />
                    </div>
                  </article>
                );
              })}
            </div>
            <SearchPagination
              page={page}
              pagination={userPagination}
              onChange={goToPage}
              isFetching={usersFetching}
            />
          </>
        ))}

      {type === "categories" &&
        (searchCategoriesLoading ? (
          <p role="status">Searching categories...</p>
        ) : searchCategoriesError ? (
          <p role="alert">Could not search categories. Please try again.</p>
        ) : matchedCategories.length === 0 ? (
          <p className="feed-empty">No categories matched your search.</p>
        ) : (
          <>
            <div
              className={`search-category-grid${searchCategoriesFetching ? " is-fetching" : ""}`}
            >
              {matchedCategories.map((category) => (
                <article className="search-category-card" key={category.id}>
                  <div>
                    <h2>{category.title}</h2>
                    {category.description && <p>{category.description}</p>}
                  </div>
                  <p className="search-category-card__creator">
                    Created by{" "}
                    <Link to={`/users/${category.created_by}`}>
                      {category.creator_full_name ||
                        `@${category.creator_login}`}
                    </Link>
                    <span>
                      {category.posts_count}{" "}
                      {category.posts_count === 1 ? "post" : "posts"}
                    </span>
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => browseCategory(category.id)}
                  >
                    Browse posts
                  </button>
                </article>
              ))}
            </div>
            <SearchPagination
              page={page}
              pagination={categoryPagination}
              onChange={goToPage}
              isFetching={searchCategoriesFetching}
            />
          </>
        ))}
    </section>
  );
}
