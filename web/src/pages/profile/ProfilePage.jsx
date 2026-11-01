import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
    setCredentials,
    selectCurrentUser,
} from '../../features/auth/authSlice';
import {
    postsApi,
    useGetCategoriesQuery,
    useUpdatePostMutation,
} from '../../features/posts/postsApi';
import {
    useCreateCategoryMutation,
    useDeleteCategoryMutation,
    useGetProfileQuery,
    useGetUserCategoriesQuery,
    useGetUserCommentsQuery,
    useGetUserPostsQuery,
    useUpdateCategoryMutation,
    useUpdateProfileMutation,
    useUploadAvatarMutation,
} from '../../features/profile/profileApi';

const API_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3000';
const PAGE_SIZE = 10;

function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function getErrorMessage(error, fallback) {
    return error?.data?.message || fallback;
}

function Pagination({ page, totalPages, onChange }) {
    if (totalPages <= 1) return null;

    return (
        <nav className="profile-pagination" aria-label="Profile content pages">
            <button
                type="button"
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => onChange(page - 1)}
            >
                Previous
            </button>
            <span>
                Page {page} of {totalPages}
            </span>
            <button
                type="button"
                className="btn btn-secondary"
                disabled={page >= totalPages}
                onClick={() => onChange(page + 1)}
            >
                Next
            </button>
        </nav>
    );
}

export function ProfilePage() {
    const dispatch = useDispatch();
    const currentUser = useSelector(selectCurrentUser);
    const token = useSelector((state) => state.auth.token);
    const userId = currentUser?.id;
    const [activeTab, setActiveTab] = useState('posts');
    const [postPage, setPostPage] = useState(1);
    const [commentPage, setCommentPage] = useState(1);
    const [editingPost, setEditingPost] = useState(null);
    const [profileNotice, setProfileNotice] = useState({
        error: '',
        success: '',
    });
    const [postNotice, setPostNotice] = useState('');
    const [categoryNotice, setCategoryNotice] = useState({
        error: '',
        success: '',
    });
    const [categoryTitle, setCategoryTitle] = useState('');
    const [categoryDescription, setCategoryDescription] = useState('');
    const [editingCategory, setEditingCategory] = useState(null);
    const [profileForm, setProfileForm] = useState({
        login: '',
        full_name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const {
        data: profile,
        error: profileError,
        isError: profileIsError,
        isLoading: profileIsLoading,
        refetch: refetchProfile,
    } = useGetProfileQuery(userId, { skip: !userId });
    const postsQuery = useGetUserPostsQuery(
        { userId, page: postPage, limit: PAGE_SIZE },
        { skip: !userId || activeTab !== 'posts' },
    );
    const commentsQuery = useGetUserCommentsQuery(
        { userId, page: commentPage, limit: PAGE_SIZE },
        { skip: !userId || activeTab !== 'comments' },
    );
    const categoriesQuery = useGetUserCategoriesQuery(userId, {
        skip: !userId || activeTab !== 'categories',
    });
    const allCategoriesQuery = useGetCategoriesQuery(undefined, {
        skip: activeTab !== 'posts' || !editingPost,
    });
    const [updateProfile, { isLoading: isSavingProfile }] =
        useUpdateProfileMutation();
    const [uploadAvatar, { isLoading: isUploadingAvatar }] =
        useUploadAvatarMutation();
    const [updatePost, { isLoading: isSavingPost }] = useUpdatePostMutation();
    const [createCategory, { isLoading: isCreatingCategory }] =
        useCreateCategoryMutation();
    const [updateCategory, { isLoading: isUpdatingCategory }] =
        useUpdateCategoryMutation();
    const [deleteCategory, { isLoading: isDeletingCategory }] =
        useDeleteCategoryMutation();

    useEffect(() => {
        if (!profile) return;
        setProfileForm((previous) => ({
            ...previous,
            login: profile.login ?? '',
            full_name: profile.full_name ?? '',
            email: profile.email ?? '',
        }));
    }, [profile]);

    if (!userId) {
        return (
            <section className="page-block">
                <h2>Profile</h2>
                <p role="alert">
                    Could not determine the current user. Please sign in again.
                </p>
            </section>
        );
    }

    if (profileIsLoading) {
        return (
            <section className="page-block" aria-busy="true">
                <p role="status">Loading your profile...</p>
            </section>
        );
    }

    if (profileIsError || !profile) {
        return (
            <section className="page-block">
                <h2>Profile</h2>
                <p role="alert">
                    {getErrorMessage(
                        profileError,
                        'Your profile could not be loaded.',
                    )}
                </p>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={refetchProfile}
                >
                    Try again
                </button>
            </section>
        );
    }

    const avatarInitial = (profile.full_name || profile.login || '?')
        .charAt(0)
        .toUpperCase();
    const avatarUrl = profile.profile_picture
        ? new URL(profile.profile_picture, API_URL).toString()
        : null;
    const posts = postsQuery.data?.data ?? [];
    const postPagination = postsQuery.data?.pagination;
    const comments = commentsQuery.data?.data ?? [];
    const commentPagination = commentsQuery.data?.pagination;
    const categories = categoriesQuery.data ?? [];

    const updateProfileField = (event) => {
        setProfileForm({
            ...profileForm,
            [event.target.name]: event.target.value,
        });
    };

    const handleProfileSubmit = async (event) => {
        event.preventDefault();
        setProfileNotice({ error: '', success: '' });

        const changes = {
            login: profileForm.login.trim(),
            full_name: profileForm.full_name.trim(),
            email: profileForm.email.trim(),
        };
        if (profileForm.password || profileForm.password_confirmation) {
            if (profileForm.password.length < 8) {
                setProfileNotice({
                    error: 'Your new password must be at least 8 characters long.',
                    success: '',
                });
                return;
            }
            if (profileForm.password !== profileForm.password_confirmation) {
                setProfileNotice({
                    error: 'The new passwords do not match.',
                    success: '',
                });
                return;
            }
            changes.password = profileForm.password;
            changes.password_confirmation = profileForm.password_confirmation;
        }

        try {
            const result = await updateProfile({ userId, changes }).unwrap();
            dispatch(setCredentials({ user: result.user, token }));
            setProfileForm((previous) => ({
                ...previous,
                password: '',
                password_confirmation: '',
            }));
            setProfileNotice({
                error: '',
                success: 'Your account details have been saved.',
            });
        } catch (error) {
            setProfileNotice({
                error: getErrorMessage(
                    error,
                    'Could not save your account details.',
                ),
                success: '',
            });
        }
    };

    const handleAvatarSubmit = async (event) => {
        event.preventDefault();
        setProfileNotice({ error: '', success: '' });
        const form = event.currentTarget;
        const file = new FormData(form).get('avatar');
        if (!(file instanceof File) || file.size === 0) {
            setProfileNotice({
                error: 'Choose an image to upload first.',
                success: '',
            });
            return;
        }
        if (
            !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(
                file.type,
            )
        ) {
            setProfileNotice({
                error: 'Choose a JPG, PNG, GIF or WEBP image.',
                success: '',
            });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setProfileNotice({
                error: 'Your image must be no larger than 5 MB.',
                success: '',
            });
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);
        try {
            const result = await uploadAvatar(formData).unwrap();
            dispatch(
                setCredentials({
                    user: {
                        ...profile,
                        profile_picture: result.profile_picture,
                    },
                    token,
                }),
            );
            form.reset();
            setProfileNotice({
                error: '',
                success: 'Your profile picture has been updated.',
            });
            refetchProfile();
        } catch (error) {
            setProfileNotice({
                error: getErrorMessage(
                    error,
                    'Could not upload your profile picture.',
                ),
                success: '',
            });
        }
    };

    const startEditingPost = (post) => {
        setPostNotice('');
        setEditingPost({
            id: post.id,
            title: post.title,
            content: post.content,
            categories: (post.categories ?? []).map((category) =>
                String(category.id),
            ),
        });
    };

    const togglePostCategory = (categoryId) => {
        const id = String(categoryId);
        setEditingPost((previous) => ({
            ...previous,
            categories: previous.categories.includes(id)
                ? previous.categories.filter((selectedId) => selectedId !== id)
                : [...previous.categories, id],
        }));
    };

    const handlePostSubmit = async (event) => {
        event.preventDefault();
        if (!editingPost.title.trim() || !editingPost.content.trim()) {
            setPostNotice('A post needs both a title and content.');
            return;
        }
        if (editingPost.categories.length === 0) {
            setPostNotice('Choose at least one category for this post.');
            return;
        }

        setPostNotice('');
        try {
            await updatePost({
                postId: editingPost.id,
                changes: {
                    title: editingPost.title.trim(),
                    content: editingPost.content.trim(),
                    categories: editingPost.categories.join(','),
                },
            }).unwrap();
            setEditingPost(null);
            await postsQuery.refetch();
        } catch (error) {
            setPostNotice(
                getErrorMessage(error, 'Could not update this post.'),
            );
        }
    };

    const handleCategoryCreate = async (event) => {
        event.preventDefault();
        setCategoryNotice({ error: '', success: '' });
        try {
            await createCategory({
                title: categoryTitle.trim(),
                description: categoryDescription.trim() || null,
            }).unwrap();
            dispatch(postsApi.util.invalidateTags(['Categories']));
            setCategoryTitle('');
            setCategoryDescription('');
            setCategoryNotice({
                error: '',
                success: 'Your category has been created.',
            });
        } catch (error) {
            setCategoryNotice({
                error: getErrorMessage(
                    error,
                    'Could not create this category.',
                ),
                success: '',
            });
        }
    };

    const handleCategoryUpdate = async (event) => {
        event.preventDefault();
        setCategoryNotice({ error: '', success: '' });
        try {
            await updateCategory({
                categoryId: editingCategory.id,
                changes: {
                    title: editingCategory.title.trim(),
                    description: editingCategory.description.trim() || null,
                },
            }).unwrap();
            dispatch(
                postsApi.util.invalidateTags([
                    'Categories',
                    'Post',
                    'PostList',
                ]),
            );
            setEditingCategory(null);
            setCategoryNotice({
                error: '',
                success: 'Your category has been updated.',
            });
        } catch (error) {
            setCategoryNotice({
                error: getErrorMessage(
                    error,
                    'Could not update this category.',
                ),
                success: '',
            });
        }
    };

    const handleCategoryDelete = async (category) => {
        if (
            !window.confirm(
                `Delete "${category.title}"? Posts will lose this category.`,
            )
        )
            return;
        setCategoryNotice({ error: '', success: '' });
        try {
            await deleteCategory(category.id).unwrap();
            dispatch(
                postsApi.util.invalidateTags([
                    'Categories',
                    'Post',
                    'PostList',
                ]),
            );
            setCategoryNotice({
                error: '',
                success: 'Your category has been deleted.',
            });
        } catch (error) {
            setCategoryNotice({
                error: getErrorMessage(
                    error,
                    'Could not delete this category.',
                ),
                success: '',
            });
        }
    };

    const tabs = [
        { id: 'posts', label: 'My posts', count: postPagination?.total_posts },
        {
            id: 'comments',
            label: 'My comments',
            count: commentPagination?.total_comments,
        },
        { id: 'categories', label: 'My categories', count: categories.length },
    ];

    return (
        <section
            className="page-block profile-page"
            aria-labelledby="profile-title"
        >
            <header className="profile-hero">
                <div className="profile-hero__identity">
                    <div
                        className="profile-avatar profile-hero__avatar"
                        aria-hidden="true"
                    >
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
                    </div>
                    <div className="profile-hero__copy">
                        <p className="eyebrow">Your space</p>
                        <h2 id="profile-title">{profile.full_name}</h2>
                        <p className="profile-handle">@{profile.login}</p>
                        <span className="profile-role">
                            {profile.role || 'member'}
                        </span>
                    </div>
                </div>
                <div className="profile-hero__details">
                    <span>Member since</span>
                    <strong>{formatDate(profile.created_at)}</strong>
                    <span>Community rating</span>
                    <strong>{profile.rating ?? 0}</strong>
                </div>
            </header>

            <div className="profile-settings-grid">
                <section
                    className="profile-panel"
                    aria-labelledby="account-details-title"
                >
                    <div className="profile-section-heading">
                        <div>
                            <p className="eyebrow">Account</p>
                            <h3 id="account-details-title">Personal details</h3>
                        </div>
                    </div>
                    <form
                        className="profile-form"
                        onSubmit={handleProfileSubmit}
                    >
                        <label>
                            Username
                            <input
                                name="login"
                                value={profileForm.login}
                                onChange={updateProfileField}
                                maxLength={255}
                                autoComplete="username"
                                required
                            />
                        </label>
                        <label>
                            Full name
                            <input
                                name="full_name"
                                value={profileForm.full_name}
                                onChange={updateProfileField}
                                maxLength={255}
                                autoComplete="name"
                                required
                            />
                        </label>
                        <label>
                            Email address
                            <input
                                name="email"
                                type="email"
                                value={profileForm.email}
                                onChange={updateProfileField}
                                maxLength={255}
                                autoComplete="email"
                                required
                            />
                        </label>
                        <div className="profile-form__divider">
                            <span>Change password</span>
                            <small>
                                Leave blank to keep your current password.
                            </small>
                        </div>
                        <label>
                            New password
                            <input
                                name="password"
                                type="password"
                                value={profileForm.password}
                                onChange={updateProfileField}
                                minLength={8}
                                autoComplete="new-password"
                            />
                        </label>
                        <label>
                            Confirm new password
                            <input
                                name="password_confirmation"
                                type="password"
                                value={profileForm.password_confirmation}
                                onChange={updateProfileField}
                                minLength={8}
                                autoComplete="new-password"
                            />
                        </label>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSavingProfile}
                        >
                            {isSavingProfile ? 'Saving...' : 'Save account'}
                        </button>
                    </form>

                    <form
                        className="profile-avatar-form"
                        onSubmit={handleAvatarSubmit}
                    >
                        <label htmlFor="profile-avatar-upload">
                            Profile picture
                        </label>
                        <div className="profile-avatar-form__controls">
                            <input
                                id="profile-avatar-upload"
                                type="file"
                                name="avatar"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                aria-describedby="avatar-help"
                                disabled={isUploadingAvatar}
                            />
                            <button
                                type="submit"
                                className="btn btn-secondary"
                                disabled={isUploadingAvatar}
                            >
                                {isUploadingAvatar ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                        <small id="avatar-help">
                            JPG, PNG, GIF or WEBP. Maximum 5 MB.
                        </small>
                    </form>
                    {profileNotice.error && (
                        <p className="error-message" role="alert">
                            {profileNotice.error}
                        </p>
                    )}
                    {profileNotice.success && (
                        <p className="success-message" role="status">
                            {profileNotice.success}
                        </p>
                    )}
                </section>

                <section
                    className="profile-content-panel"
                    aria-label="Your community activity"
                >
                    <nav className="profile-tabs" aria-label="Profile content">
                        {tabs.map((tab) => (
                            <button
                                type="button"
                                key={tab.id}
                                className={`profile-tab${activeTab === tab.id ? ' is-active' : ''}`}
                                aria-pressed={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                                {Number.isInteger(tab.count) && (
                                    <span className="profile-tab__count">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>

                    {activeTab === 'posts' && (
                        <div className="profile-content-list">
                            {postsQuery.isLoading ? (
                                <p role="status">Loading your posts...</p>
                            ) : postsQuery.isError ? (
                                <div className="profile-inline-error">
                                    <p role="alert">
                                        {getErrorMessage(
                                            postsQuery.error,
                                            'Your posts could not be loaded.',
                                        )}
                                    </p>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={postsQuery.refetch}
                                    >
                                        Try again
                                    </button>
                                </div>
                            ) : posts.length === 0 ? (
                                <div className="profile-empty">
                                    <h3>Your story starts here</h3>
                                    <p>You have not published any posts yet.</p>
                                    <Link
                                        to="/posts/new"
                                        className="btn btn-primary"
                                    >
                                        Write your first post
                                    </Link>
                                </div>
                            ) : (
                                posts.map((post) => (
                                    <article
                                        className="profile-post-card"
                                        key={post.id}
                                    >
                                        <div className="profile-post-card__heading">
                                            <div>
                                                <div className="profile-chip-list">
                                                    {post.categories?.map(
                                                        (category) => (
                                                            <span
                                                                className="profile-chip"
                                                                key={
                                                                    category.id
                                                                }
                                                            >
                                                                {category.title}
                                                            </span>
                                                        ),
                                                    )}
                                                </div>
                                                <h3>
                                                    <Link
                                                        to={`/posts/${post.id}`}
                                                    >
                                                        {post.title}
                                                    </Link>
                                                </h3>
                                                <p className="profile-post-meta">
                                                    {formatDate(
                                                        post.created_at,
                                                    )}{' '}
                                                    <span>·</span>
                                                    {post.likes_count ?? 0}{' '}
                                                    likes <span>·</span>
                                                    {post.status}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-secondary profile-edit-button"
                                                onClick={() =>
                                                    startEditingPost(post)
                                                }
                                            >
                                                Edit post
                                            </button>
                                        </div>
                                        <p className="profile-post-excerpt">
                                            {post.content.length > 260
                                                ? `${post.content.slice(0, 257).trimEnd()}...`
                                                : post.content}
                                        </p>
                                        {editingPost?.id === post.id && (
                                            <form
                                                className="profile-edit-form"
                                                onSubmit={handlePostSubmit}
                                            >
                                                <label>
                                                    Post title
                                                    <input
                                                        value={
                                                            editingPost.title
                                                        }
                                                        onChange={(event) =>
                                                            setEditingPost({
                                                                ...editingPost,
                                                                title: event
                                                                    .target
                                                                    .value,
                                                            })
                                                        }
                                                        maxLength={255}
                                                        required
                                                    />
                                                </label>
                                                <label>
                                                    Post content
                                                    <textarea
                                                        value={
                                                            editingPost.content
                                                        }
                                                        onChange={(event) =>
                                                            setEditingPost({
                                                                ...editingPost,
                                                                content:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                        rows={6}
                                                        maxLength={10000}
                                                        required
                                                    />
                                                </label>
                                                <fieldset className="profile-category-picker">
                                                    <legend>Categories</legend>
                                                    {allCategoriesQuery.isError ? (
                                                        <p role="alert">
                                                            Could not load
                                                            categories.
                                                        </p>
                                                    ) : (
                                                        (
                                                            allCategoriesQuery.data ??
                                                            []
                                                        ).map((category) => (
                                                            <button
                                                                type="button"
                                                                key={
                                                                    category.id
                                                                }
                                                                className={`profile-chip-button${editingPost.categories.includes(String(category.id)) ? ' is-selected' : ''}`}
                                                                aria-pressed={editingPost.categories.includes(
                                                                    String(
                                                                        category.id,
                                                                    ),
                                                                )}
                                                                onClick={() =>
                                                                    togglePostCategory(
                                                                        category.id,
                                                                    )
                                                                }
                                                            >
                                                                {category.title}
                                                            </button>
                                                        ))
                                                    )}
                                                </fieldset>
                                                {postNotice && (
                                                    <p
                                                        className="error-message"
                                                        role="alert"
                                                    >
                                                        {postNotice}
                                                    </p>
                                                )}
                                                <div className="profile-form-actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() => {
                                                            setEditingPost(
                                                                null,
                                                            );
                                                            setPostNotice('');
                                                        }}
                                                        disabled={isSavingPost}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="btn btn-primary"
                                                        disabled={isSavingPost}
                                                    >
                                                        {isSavingPost
                                                            ? 'Saving...'
                                                            : 'Save post'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </article>
                                ))
                            )}
                            <Pagination
                                page={postPage}
                                totalPages={postPagination?.total_pages ?? 1}
                                onChange={setPostPage}
                            />
                        </div>
                    )}

                    {activeTab === 'comments' && (
                        <div className="profile-content-list">
                            {commentsQuery.isLoading ? (
                                <p role="status">Loading your comments...</p>
                            ) : commentsQuery.isError ? (
                                <div className="profile-inline-error">
                                    <p role="alert">
                                        {getErrorMessage(
                                            commentsQuery.error,
                                            'Your comments could not be loaded.',
                                        )}
                                    </p>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={commentsQuery.refetch}
                                    >
                                        Try again
                                    </button>
                                </div>
                            ) : comments.length === 0 ? (
                                <div className="profile-empty">
                                    <h3>No comments yet</h3>
                                    <p>
                                        Join a conversation to see your comments
                                        here.
                                    </p>
                                </div>
                            ) : (
                                comments.map((comment) => (
                                    <article
                                        className="profile-comment-card"
                                        key={comment.id}
                                    >
                                        <div className="profile-post-meta">
                                            <span>
                                                {formatDate(comment.created_at)}
                                            </span>
                                            <span>·</span>
                                            <span>
                                                {comment.likes_count ?? 0} likes
                                            </span>
                                        </div>
                                        <p>{comment.content}</p>
                                        <Link
                                            to={`/posts/${comment.post_id}#comment-${comment.id}`}
                                        >
                                            In: {comment.post_title}
                                        </Link>
                                    </article>
                                ))
                            )}
                            <Pagination
                                page={commentPage}
                                totalPages={commentPagination?.total_pages ?? 1}
                                onChange={setCommentPage}
                            />
                        </div>
                    )}

                    {activeTab === 'categories' && (
                        <div className="profile-content-list">
                            <form
                                className="profile-category-create"
                                onSubmit={handleCategoryCreate}
                            >
                                <div>
                                    <p className="eyebrow">
                                        Build your own topic
                                    </p>
                                    <h3>Create a category</h3>
                                </div>
                                <label>
                                    Category name
                                    <input
                                        value={categoryTitle}
                                        onChange={(event) =>
                                            setCategoryTitle(event.target.value)
                                        }
                                        maxLength={255}
                                        required
                                        placeholder="e.g. Frontend patterns"
                                    />
                                </label>
                                <label>
                                    Description{' '}
                                    <span className="profile-optional">
                                        (optional)
                                    </span>
                                    <textarea
                                        value={categoryDescription}
                                        onChange={(event) =>
                                            setCategoryDescription(
                                                event.target.value,
                                            )
                                        }
                                        maxLength={1000}
                                        rows={2}
                                        placeholder="What belongs in this topic?"
                                    />
                                </label>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isCreatingCategory}
                                >
                                    {isCreatingCategory
                                        ? 'Creating...'
                                        : 'Create category'}
                                </button>
                            </form>
                            {categoryNotice.error && (
                                <p className="error-message" role="alert">
                                    {categoryNotice.error}
                                </p>
                            )}
                            {categoryNotice.success && (
                                <p className="success-message" role="status">
                                    {categoryNotice.success}
                                </p>
                            )}

                            {categoriesQuery.isLoading ? (
                                <p role="status">Loading your categories...</p>
                            ) : categoriesQuery.isError ? (
                                <div className="profile-inline-error">
                                    <p role="alert">
                                        {getErrorMessage(
                                            categoriesQuery.error,
                                            'Your categories could not be loaded.',
                                        )}
                                    </p>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={categoriesQuery.refetch}
                                    >
                                        Try again
                                    </button>
                                </div>
                            ) : categories.length === 0 ? (
                                <div className="profile-empty">
                                    <h3>No categories created yet</h3>
                                    <p>
                                        Create a category above to help organize
                                        the forum.
                                    </p>
                                </div>
                            ) : (
                                categories.map((category) => (
                                    <article
                                        className="profile-category-card"
                                        key={category.id}
                                    >
                                        {editingCategory?.id === category.id ? (
                                            <form
                                                className="profile-edit-form"
                                                onSubmit={handleCategoryUpdate}
                                            >
                                                <label>
                                                    Category name
                                                    <input
                                                        value={
                                                            editingCategory.title
                                                        }
                                                        onChange={(event) =>
                                                            setEditingCategory({
                                                                ...editingCategory,
                                                                title: event
                                                                    .target
                                                                    .value,
                                                            })
                                                        }
                                                        maxLength={255}
                                                        required
                                                    />
                                                </label>
                                                <label>
                                                    Description
                                                    <textarea
                                                        value={
                                                            editingCategory.description
                                                        }
                                                        onChange={(event) =>
                                                            setEditingCategory({
                                                                ...editingCategory,
                                                                description:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                        maxLength={1000}
                                                        rows={3}
                                                    />
                                                </label>
                                                <div className="profile-form-actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() =>
                                                            setEditingCategory(
                                                                null,
                                                            )
                                                        }
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="btn btn-primary"
                                                        disabled={
                                                            isUpdatingCategory
                                                        }
                                                    >
                                                        {isUpdatingCategory
                                                            ? 'Saving...'
                                                            : 'Save category'}
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <>
                                                <div>
                                                    <h3>{category.title}</h3>
                                                    <p>
                                                        {category.description ||
                                                            'No description added.'}
                                                    </p>
                                                    <small>
                                                        Created{' '}
                                                        {formatDate(
                                                            category.created_at,
                                                        )}
                                                    </small>
                                                </div>
                                                <div className="profile-form-actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() =>
                                                            setEditingCategory({
                                                                id: category.id,
                                                                title: category.title,
                                                                description:
                                                                    category.description ??
                                                                    '',
                                                            })
                                                        }
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger"
                                                        disabled={
                                                            isDeletingCategory
                                                        }
                                                        onClick={() =>
                                                            handleCategoryDelete(
                                                                category,
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </article>
                                ))
                            )}
                        </div>
                    )}
                </section>
            </div>
        </section>
    );
}
