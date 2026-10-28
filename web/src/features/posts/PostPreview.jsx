import { Link } from 'react-router-dom';
import { useGetPostCommentsQuery } from './postsApi';
import { PostRating } from './PostRating';

function getExcerpt(content, maxLength = 280) {
    const text = content?.trim() ?? '';
    return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}...` : text;
}

export function PostPreview({ post }) {
    const { data: comments = [], isLoading, isError } = useGetPostCommentsQuery(post.id);
    const comment = comments.at(-1);

    return (
        <article className="post-preview">
            <PostRating post={post} />
            <div className="post-preview-body">
                <div className="post-preview-meta">
                    <span>Posted by <strong>{post.author_login}</strong></span>
                    {post.categories?.map((category) => (
                        <span className="post-category-tag" key={category.id}>{category.title}</span>
                    ))}
                </div>
                <Link to={`/posts/${post.id}`} className="post-preview-link">
                    <h3>{post.title}</h3>
                    <p className="post-preview-excerpt">{getExcerpt(post.content)}</p>
                    <div className="post-preview-comment">
                        <strong>Latest comment</strong>
                        {isLoading ? (
                            <span>Loading comment...</span>
                        ) : isError ? (
                            <span>Could not load comment preview.</span>
                        ) : comment ? (
                            <span><b>{comment.author_login}:</b> {getExcerpt(comment.content, 160)}</span>
                        ) : (
                            <span>No comments yet. Be the first to join the discussion.</span>
                        )}
                    </div>
                    <span className="post-preview-read-more">Read full post →</span>
                </Link>
            </div>
        </article>
    );
}
