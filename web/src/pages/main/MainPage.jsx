import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button } from '../../components/common/Button';
import { selectIsAuthenticated } from '../../features/auth/authSlice';
import { useGetCategoriesQuery, useGetPostsQuery } from '../../features/posts/postsApi';
export function MainPage() {
    const [selectedCategory, setSelectedCategory] = useState('');
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const { data: categories = [], isLoading: categoriesLoading, isError: categoriesError } = useGetCategoriesQuery();
    const { data: response, isLoading, isError } = useGetPostsQuery({
        categories: selectedCategory ? [selectedCategory] : undefined,
    });
    const posts = response?.data ?? [];

    return (<section className="page-block">
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
                onClick={() => setSelectedCategory('')}
              >
                All posts
              </button>
              {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`category-filter${selectedCategory === String(category.id) ? ' active' : ''}`}
                    aria-pressed={selectedCategory === String(category.id)}
                    onClick={() => setSelectedCategory(String(category.id))}
                  >
                    {category.title}
                  </button>
              ))}
            </div>
        )}
      </section>

      {isLoading ? (<p>Loading posts...</p>) : isError ? (<p>Could not load posts.</p>) : (<div className="feed-list">
          {posts.length === 0 ? (
              <p className="feed-empty">No posts in this topic yet.</p>
          ) : posts.map((post) => (<article key={post.id} className="feed-card">
              <div className="feed-card__top">
                <h3>{post.title}</h3>
                <span className="tag">{post.likes_count} likes</span>
              </div>
              <p>by {post.author_login}</p>
            </article>))}
        </div>)}
    </section>);
}
