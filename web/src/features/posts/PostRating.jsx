import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectCurrentUser, selectIsAuthenticated } from '../auth/authSlice';
import { useAddPostLikeMutation, useGetPostLikesQuery } from './postsApi';
import { VoteButton } from './VoteButton';

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
        <div className="post-rating" role="group" aria-label="Rate this post">
            <VoteButton
                type="like"
                active={currentRating === 'like'}
                count={post.likes_count ?? 0}
                disabled={!isAuthenticated || isLoading}
                onClick={() => handleRating('like')}
            />
            <VoteButton
                type="dislike"
                active={currentRating === 'dislike'}
                count={post.dislikes_count ?? 0}
                disabled={!isAuthenticated || isLoading}
                onClick={() => handleRating('dislike')}
            />
            {!isAuthenticated && (
                <span className="rating-login-prompt">
                    <Link to="/login">Log in</Link> to vote
                </span>
            )}
            {errorMessage && <span className="rating-error" role="alert">{errorMessage}</span>}
        </div>
    );
}