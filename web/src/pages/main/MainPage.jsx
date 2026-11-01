import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PostPreview } from '../../features/posts/PostPreview';
import { useGetCategoriesQuery, useGetPostsQuery } from '../../features/posts/postsApi';

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
    { id: 'date_desc', label: 'Newest first', sort: 'date', order: 'desc' },
    { id: 'date_asc', label: 'Oldest first', sort: 'date', order: 'asc' },
    { id: 'likes_desc', label: 'Most liked', sort: 'likes', order: 'desc' },
];

export function MainPage() {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortId, setSortId] = useState('date_desc');
    const [page, setPage] = useState(1);
    const [searchParams] = useSearchParams();
    const search = searchParams.get('search')?.trim() ?? '';
    const { sort, order } = SORT_OPTIONS.find((option) => option.id === sortId);

    useEffect(() => {
        setPage(1);
    }, [search]);

    const { data: categories = [], isLoading: categoriesLoading, isError: categoriesError } = useGetCategoriesQuery();
    const { data: response, isLoading, isError, isFetching } = useGetPostsQuery({
        categories: selectedCategory ? [selectedCategory] : undefined,
        sort,
        order,
        search,
        page,
        limit: PAGE_SIZE,
    });
    const posts = response?.data ?? [];
    const pagination = response?.pagination ?? {};
    const totalPages =
        pagination.total_pages ?? Math.max(1, Math.ceil((pagination.total_posts ?? 0) / PAGE_SIZE));

    const chooseCategory = (id) => { setSelectedCategory(id); setPage(1); };
    const chooseSort = (id) => { setSortId(id); setPage(1); };
    const goToPage = (next) => { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    return (
        <section className="page-block">
            <div className="feed-top">
                <div className="feed-top__filters">
                    <section className="category-section" aria-label="Browse posts by category">
                        <h3>Explore topics</h3>
                        {categoriesLoading ? (
                            <p className="category-status">Loading categories...</p>
                        ) : categoriesError ? (
                            <p className="category-status" role="alert">Could not load categories.</p>
                        ) : (
                            <div className="category-filter-list">
                                <button
                                    type="button"
                                    className={`category-filter${selectedCategory ? '' : ' active'}`}
                                    aria-pressed={!selectedCategory}
                                    onClick={() => chooseCategory('')}
                                >
                                    All posts
                                </button>
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        type="button"
                                        className={`category-filter${selectedCategory === String(category.id) ? ' active' : ''}`}
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
                                    className={`category-filter${sortId === option.id ? ' active' : ''}`}
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
                    <svg className="create-post-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="create-post-btn__label">Create post</span>
                </Link>
            </div>

            {isLoading ? (
                <p>Loading posts...</p>
            ) : isError ? (
                <p>Could not load posts.</p>
            ) : (
                <>
                    <div className="feed-list" style={{ opacity: isFetching ? 0.6 : 1 }}>
                        {posts.length === 0 ? (
                            <p className="feed-empty">
                                {search ? 'No posts matched your search.' : 'No posts in this topic yet.'}
                            </p>
                        ) : (
                            posts.map((post) => <PostPreview key={post.id} post={post} />)
                        )}
                    </div>

                    {totalPages > 1 && (
                        <nav className="feed-pagination" aria-label="Pagination">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                disabled={page <= 1}
                                onClick={() => goToPage(page - 1)}
                            >
                                ← Previous
                            </button>
                            <span>Page {page} of {totalPages}</span>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                disabled={page >= totalPages}
                                onClick={() => goToPage(page + 1)}
                            >
                                Next →
                            </button>
                        </nav>
                    )}
                </>
            )}
        </section>
    );
}