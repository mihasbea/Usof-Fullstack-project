import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectCurrentUser, selectIsAuthenticated } from '../auth/authSlice';
import { useAddPostLikeMutation, useGetPostLikesQuery } from './postsApi';

export function PostRating({ post }) {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const user = useSelector(selectCurrentUser);
    const [errorMessage, setErrorMessage] = useState('');
    const { data: ratings = [] } = useGetPostLikesQuery(post.id, { skip: !isAuthenticated });
    const [addPostLike, { isLoading }] = useAddPostLikeMutation();
    const currentRating = ratings.find((rating) => rating.author_id === user?.id)?.type;

    const handleRating = async (type) => {
        setErrorMessage('');
        try {
            await addPostLike({ postId: post.id, type }).unwrap();
        } catch (error) {
            setErrorMessage(error?.data?.message || 'Could not save your reaction. Please try again.');
        }
    };

    return (
        <div className="post-rating" aria-label="Rate this post">
            <button
                type="button"
                className={`rating-button${currentRating === 'like' ? ' active' : ''}`}
                onClick={() => handleRating('like')}
                disabled={!isAuthenticated || isLoading}
                aria-label={`Like post, ${post.likes_count ?? 0} likes`}
                title={isAuthenticated ? 'Like' : 'Log in to like this post'}
            >
                <span aria-hidden="true">▲</span>
                <span>{post.likes_count ?? 0}</span>
            </button>
            <button
                type="button"
                className={`rating-button${currentRating === 'dislike' ? ' active' : ''}`}
                onClick={() => handleRating('dislike')}
                disabled={!isAuthenticated || isLoading}
                aria-label={`Dislike post, ${post.dislikes_count ?? 0} dislikes`}
                title={isAuthenticated ? 'Dislike' : 'Log in to dislike this post'}
            >
                <span aria-hidden="true">▼</span>
                <span>{post.dislikes_count ?? 0}</span>
            </button>
            {!isAuthenticated && (
                <span className="rating-login-prompt">
                    <Link to="/login">Log in</Link> to vote
                </span>
            )}
            {errorMessage && <span className="rating-error" role="alert">{errorMessage}</span>}
        </div>
    );
}
