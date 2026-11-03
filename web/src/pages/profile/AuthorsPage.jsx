import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthorFollowButton } from "../../features/posts/PostActions";
import { useGetUserDirectoryQuery } from "../../features/profile/profileApi";

const PAGE_SIZE = 20;

export function AuthorsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetUserDirectoryQuery({ page, limit: PAGE_SIZE });
  const authors = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <section className="page-block authors-page">
      <div className="authors-results-heading">
        {Number.isInteger(pagination?.total_users) && (
          <span>{pagination.total_users} members</span>
        )}
      </div>

      {isLoading ? (
        <p role="status">Loading authors...</p>
      ) : isError ? (
        <div className="public-profile-error">
          <p role="alert">
            {error?.data?.message || "Authors could not be loaded."}
          </p>
          <button type="button" className="btn btn-secondary" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : authors.length === 0 ? (
        <div className="public-profile-empty">
          <h2>No authors yet</h2>
          <p>Check back later to discover community members.</p>
        </div>
      ) : (
        <>
          <div className={`authors-grid${isFetching ? " is-fetching" : ""}`}>
            {authors.map((author) => {
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
                    <AuthorFollowButton
                      author={author}
                      compact
                      onFollowChange={refetch}
                    />
                  </div>
                </article>
              );
            })}
          </div>
          {pagination?.total_pages > 1 && (
            <nav
              className="public-profile-pagination"
              aria-label="Author pages"
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
