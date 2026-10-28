import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../../features/auth/authSlice';
import { PostRating } from '../../features/posts/PostRating';
import {
    useAddPostCommentMutation,
    useGetPostByIdQuery,
    useGetPostCommentsQuery,
} from '../../features/posts/postsApi';

export function PostPage() {
    const { postId } = useParams();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const [commentError, setCommentError] = useState('');
    const { data: post, isLoading, isError } = useGetPostByIdQuery(postId);
    const { data: comments = [], isLoading: commentsLoading } = useGetPostCommentsQuery(postId);
    const [addPostComment, { isLoading: isSubmitting }] = useAddPostCommentMutation();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setCommentError('');
        const form = event.currentTarget;
        const content = String(new FormData(form).get('content') ?? '').trim();
        if (!content) return;

        try {
            await addPostComment({ postId, content }).unwrap();
            form.reset();
        } catch (error) {
            setCommentError(error?.data?.message || 'Could not add your comment. Please try again.');
        }
    };

    if (isLoading) {
        return <section className="page-block"><p>Loading post...</p></section>;
    }

    if (isError || !post) {
        return (
            <section className="page-block">
                <p role="alert">Could not load this post.</p>
                <Link to="/">Back to the main page</Link>
            </section>
        );
    }

    return (
        <section className="page-block post-detail">
            <Link to="/" className="post-back-link">← Back to posts</Link>
            <div className="post-detail-header">
                <div className="post-category-list">
                    {post.categories?.map((category) => (
                        <span className="post-category-tag" key={category.id}>{category.title}</span>
                    ))}
                </div>
                <h2>{post.title}</h2>
                <p className="post-author">Posted by <strong>{post.author_login}</strong></p>
            </div>
            <div className="post-detail-content">{post.content}</div>
            <PostRating post={post} />

            <section className="post-comments" aria-labelledby="comments-heading">
                <h3 id="comments-heading">Discussion ({comments.length})</h3>
                {commentsLoading ? (
                    <p>Loading comments...</p>
                ) : comments.length > 0 ? (
                    <div className="post-comments-list">
                        {comments.map((comment) => (
                            <article className="post-comment" key={comment.id}>
                                <p>{comment.content}</p>
                                <span>Comment by <strong>{comment.author_login}</strong></span>
                            </article>
                        ))}
                    </div>
                ) : (
                    <p className="feed-empty">No comments yet. Start the discussion.</p>
                )}

                {isAuthenticated ? (
                    <form className="post-comment-form" onSubmit={handleSubmit}>
                        <label htmlFor="post-comment-content">Add a comment</label>
                        <textarea
                            id="post-comment-content"
                            name="content"
                            rows="4"
                            maxLength="1000"
                            placeholder="Share a helpful thought..."
                            required
                            disabled={isSubmitting}
                        />
                        {commentError && <p className="error-message" role="alert">{commentError}</p>}
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Posting...' : 'Post comment'}
                        </button>
                    </form>
                ) : (
                    <p className="post-comment-signin">
                        <Link to="/login" state={{ from: `/posts/${postId}` }}>Log in</Link> or{' '}
                        <Link to="/signup">create an account</Link> to join the discussion.
                    </p>
                )}
            </section>
        </section>
    );
}
