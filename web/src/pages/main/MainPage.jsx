import { Button } from '../../components/common/Button';
import { useGetPostsQuery } from '../../features/posts/postsApi';
export function MainPage() {
    const { data: response, isLoading, isError } = useGetPostsQuery();
    const posts = response?.data ?? [];
    return (<section className="page-block">
      <div className="page-header">
        <div>
          <p className="eyebrow">Home</p>
          <h2>Main page</h2>
        </div>
        <Button variant="primary">New post</Button>
      </div>

      {isLoading ? (<p>Loading posts...</p>) : isError ? (<p>Could not load posts.</p>) : (<div className="feed-list">
          {posts.map((post) => (<article key={post.id} className="feed-card">
              <div className="feed-card__top">
                <h3>{post.title}</h3>
                <span className="tag">{post.likes_count} likes</span>
              </div>
              <p>by {post.author_login}</p>
            </article>))}
        </div>)}
    </section>);
}
