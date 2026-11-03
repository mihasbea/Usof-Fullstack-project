import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { BackChevron } from "../../components/layout/BackChevron";
import { selectCurrentUser } from "../../features/auth/authSlice";
import { AuthorFollowButton } from "../../features/posts/PostActions";
import { PostPreview } from "../../features/posts/PostPreview";
import { DeleteCommentButton } from "../../features/posts/DeleteCommentButton";
import {
  useDeletePostMutation,
  useUpdateCommentMutation,
  useUpdatePostMutation,
  useGetCategoriesQuery,
} from "../../features/posts/postsApi";
import {
  useDeleteCategoryMutation,
  useDeleteUserMutation,
  useGetProfileQuery,
  useGetUserCategoriesQuery,
  useGetUserCommentsQuery,
  useGetUserFollowersQuery,
  useGetUserPostsQuery,
  useUpdateCategoryMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} from "../../features/profile/profileApi";

const PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="public-profile-pagination" aria-label="Profile pages">
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

function ProfileError({ error, fallback, onRetry }) {
  return (
    <div className="public-profile-error">
      <p role="alert">{error?.data?.message || fallback}</p>
      <button type="button" className="btn btn-secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function AdminCommentCard({ comment, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [error, setError] = useState("");
  const [updateComment, { isLoading }] = useUpdateCommentMutation();

  const saveComment = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await updateComment({
        commentId: comment.id,
        content: content.trim(),
      }).unwrap();
      setEditing(false);
      onRefresh();
    } catch (mutationError) {
      setError(
        mutationError?.data?.message || "Could not update this comment.",
      );
    }
  };

  return (
    <article className="public-comment-card" key={comment.id}>
      <div className="public-comment-card__meta">
        <span>{formatDate(comment.created_at)}</span>
        <span>·</span>
        <span>{comment.likes_count ?? 0} likes</span>
      </div>
      {editing ? (
        <form className="profile-edit-form" onSubmit={saveComment}>
          <label>
            Comment
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              maxLength={10000}
              required
              disabled={isLoading}
            />
          </label>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="profile-form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditing(false)}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !content.trim()}
            >
              {isLoading ? "Saving..." : "Save comment"}
            </button>
          </div>
        </form>
      ) : (
        <p>{comment.content}</p>
      )}
      <Link to={`/posts/${comment.post_id}`}>On: {comment.post_title}</Link>
      <div className="profile-post-card__actions">
        {!editing && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setContent(comment.content);
              setEditing(true);
            }}
          >
            Edit comment
          </button>
        )}
        <DeleteCommentButton comment={comment} onDeleted={onRefresh} />
      </div>
    </article>
  );
}

export function PublicProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const isAdmin = currentUser?.role === "admin";
  const [activeTab, setActiveTab] = useState("posts");
  const [postPage, setPostPage] = useState(1);
  const [commentPage, setCommentPage] = useState(1);
  const [followerPage, setFollowerPage] = useState(1);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    login: "",
    full_name: "",
    email: "",
    role: "user",
    email_confirmed: false,
    password: "",
    password_confirmation: "",
  });
  const [profileNotice, setProfileNotice] = useState({
    error: "",
    success: "",
  });
  const [editingPost, setEditingPost] = useState(null);
  const [postNotice, setPostNotice] = useState("");
  const [postError, setPostError] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryNotice, setCategoryNotice] = useState("");
  const profileQuery = useGetProfileQuery(userId, {
    refetchOnMountOrArgChange: true,
  });
  const postsQuery = useGetUserPostsQuery(
    {
      userId,
      page: postPage,
      limit: PAGE_SIZE,
      allAuthors: isAdmin && String(currentUser?.id) === String(userId),
    },
    { skip: activeTab !== "posts" },
  );
  const commentsQuery = useGetUserCommentsQuery(
    { userId, page: commentPage, limit: PAGE_SIZE },
    { skip: activeTab !== "comments" },
  );
  const categoriesQuery = useGetUserCategoriesQuery(userId, {
    skip: activeTab !== "categories",
  });
  const followersQuery = useGetUserFollowersQuery(
    { userId, page: followerPage, limit: PAGE_SIZE },
    { skip: activeTab !== "followers" },
  );
  const categoriesForEditQuery = useGetCategoriesQuery(undefined, {
    skip: !isAdmin || activeTab !== "posts" || !editingPost,
  });
  const [updateProfile, { isLoading: isSavingProfile }] =
    useUpdateProfileMutation();
  const [uploadAvatar, { isLoading: isUploadingAvatar }] =
    useUploadAvatarMutation();
  const [deleteUser, { isLoading: isDeletingUser }] = useDeleteUserMutation();
  const [updatePost, { isLoading: isSavingPost }] = useUpdatePostMutation();
  const [deletePost, { isLoading: isDeletingPost }] = useDeletePostMutation();
  const [updateCategory, { isLoading: isSavingCategory }] =
    useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: isDeletingCategory }] =
    useDeleteCategoryMutation();
  const profile = profileQuery.data;
  const isOwnProfile = currentUser && String(currentUser.id) === String(userId);

  useEffect(() => {
    if (!profile) return;
    setProfileForm((previous) => ({
      ...previous,
      login: profile.login ?? "",
      full_name: profile.full_name ?? "",
      email: profile.email ?? "",
      role: profile.role ?? "user",
      email_confirmed: Boolean(profile.email_confirmed),
    }));
  }, [profile]);

  useEffect(() => {
    setActiveTab("posts");
    setPostPage(1);
    setCommentPage(1);
    setFollowerPage(1);
  }, [userId]);

  if (profileQuery.isLoading) {
    return (
      <section className="page-block public-profile-loading" aria-busy="true">
        <p role="status">Loading profile...</p>
      </section>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <section className="page-block public-profile-error-page">
        <h1>Profile unavailable</h1>
        <p>
          {profileQuery.error?.data?.message ||
            "This profile could not be loaded."}
        </p>
        <Link to="/authors" className="btn btn-secondary">
          Browse authors
        </Link>
      </section>
    );
  }

  const posts = postsQuery.data?.data ?? [];
  const comments = commentsQuery.data?.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const followers = followersQuery.data?.data ?? [];
  const avatarInitial = (profile.full_name || profile.login || "?")
    .charAt(0)
    .toUpperCase();
  const apiUrl = process.env.REACT_APP_API_URL ?? "http://localhost:3000";
  const avatarUrl = profile.profile_picture
    ? new URL(profile.profile_picture, apiUrl).toString()
    : null;
  const tabs = [
    {
      id: "posts",
      label: "Posts",
      count: postsQuery.data?.pagination?.total_posts ?? profile.post_count,
    },
    {
      id: "comments",
      label: "Comments",
      count:
        commentsQuery.data?.pagination?.total_comments ?? profile.comment_count,
    },
    {
      id: "categories",
      label: "Topics",
      count: categoriesQuery.data?.length ?? profile.category_count,
    },
    {
      id: "followers",
      label: "Followers",
      count:
        followersQuery.data?.pagination?.total_followers ??
        profile.follower_count,
    },
  ];

  const saveAdminProfile = async (event) => {
    event.preventDefault();
    setProfileNotice({ error: "", success: "" });
    const changes = {
      login: profileForm.login.trim(),
      full_name: profileForm.full_name.trim(),
      email: profileForm.email.trim(),
      role: profileForm.role,
      email_confirmed: profileForm.email_confirmed,
    };
    if (profileForm.password || profileForm.password_confirmation) {
      if (profileForm.password.length < 8) {
        setProfileNotice({
          error: "The new password must be at least 8 characters long.",
          success: "",
        });
        return;
      }
      if (profileForm.password !== profileForm.password_confirmation) {
        setProfileNotice({
          error: "The new passwords do not match.",
          success: "",
        });
        return;
      }
      changes.password = profileForm.password;
      changes.password_confirmation = profileForm.password_confirmation;
    }

    try {
      await updateProfile({ userId, changes }).unwrap();
      setProfileForm((previous) => ({
        ...previous,
        password: "",
        password_confirmation: "",
      }));
      setProfileNotice({ error: "", success: "User profile updated." });
      await profileQuery.refetch();
    } catch (error) {
      setProfileNotice({
        error: error?.data?.message || "Could not update this profile.",
        success: "",
      });
    }
  };

  const uploadAdminAvatar = async (event) => {
    event.preventDefault();
    setProfileNotice({ error: "", success: "" });
    const form = event.currentTarget;
    const file = new FormData(form).get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      setProfileNotice({
        error: "Choose an image to upload first.",
        success: "",
      });
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        file.type,
      ) ||
      file.size > 5 * 1024 * 1024
    ) {
      setProfileNotice({
        error: "Choose a JPG, PNG, GIF or WEBP image up to 5 MB.",
        success: "",
      });
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);
    try {
      await uploadAvatar({ formData, userId }).unwrap();
      form.reset();
      setProfileNotice({ error: "", success: "Profile picture updated." });
      await profileQuery.refetch();
    } catch (error) {
      setProfileNotice({
        error: error?.data?.message || "Could not upload this profile picture.",
        success: "",
      });
    }
  };

  const removeUser = async () => {
    if (
      !window.confirm(`Permanently delete @${profile.login} and their data?`)
    ) {
      return;
    }
    setProfileNotice({ error: "", success: "" });
    try {
      await deleteUser(userId).unwrap();
      navigate("/authors", { replace: true });
    } catch (error) {
      setProfileNotice({
        error: error?.data?.message || "Could not delete this account.",
        success: "",
      });
    }
  };

  const savePost = async (event) => {
    event.preventDefault();
    setPostNotice("");
    if (!editingPost.title.trim() || !editingPost.content.trim()) {
      setPostNotice("A post needs both a title and content.");
      return;
    }
    if (editingPost.categories.length === 0) {
      setPostNotice("Choose at least one category.");
      return;
    }

    try {
      await updatePost({
        postId: editingPost.id,
        changes: {
          title: editingPost.title.trim(),
          content: editingPost.content.trim(),
          categories: editingPost.categories.join(","),
          status: editingPost.status,
        },
      }).unwrap();
      setEditingPost(null);
      await postsQuery.refetch();
      await profileQuery.refetch();
    } catch (error) {
      setPostNotice(error?.data?.message || "Could not update this post.");
    }
  };

  const removePost = async (post) => {
    if (!window.confirm(`Permanently delete “${post.title}”?`)) return;
    setPostError("");
    try {
      await deletePost(post.id).unwrap();
      await postsQuery.refetch();
      await profileQuery.refetch();
    } catch (error) {
      setPostError(error?.data?.message || "Could not delete this post.");
    }
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setCategoryNotice("");
    try {
      await updateCategory({
        categoryId: editingCategory.id,
        changes: {
          title: editingCategory.title.trim(),
          description: editingCategory.description.trim() || null,
        },
      }).unwrap();
      setEditingCategory(null);
      await categoriesQuery.refetch();
      await profileQuery.refetch();
    } catch (error) {
      setCategoryNotice(error?.data?.message || "Could not update this topic.");
    }
  };

  const removeCategory = async (category) => {
    if (!window.confirm(`Delete the topic “${category.title}”?`)) return;
    setCategoryNotice("");
    try {
      await deleteCategory(category.id).unwrap();
      await categoriesQuery.refetch();
      await profileQuery.refetch();
    } catch (error) {
      setCategoryNotice(error?.data?.message || "Could not delete this topic.");
    }
  };

  return (
    <section className="page-block public-profile-page">
      <Link to="/authors" className="public-profile-back">
        <BackChevron /> All authors
      </Link>

      <header className="public-profile-hero">
        <div className="public-profile-identity">
          <div className="public-profile-avatar">
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
          <div className="public-profile-copy">
            <h1>{profile.full_name || profile.login}</h1>
            <p className="public-profile-handle">@{profile.login}</p>
            <p className="public-profile-joined">
              Member since {formatDate(profile.created_at)}
            </p>
          </div>
        </div>
        <div className="public-profile-hero__actions">
          {isOwnProfile ? (
            <Link to="/profile" className="btn btn-secondary">
              Edit my profile
            </Link>
          ) : isAdmin ? (
            <div className="profile-post-card__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditingProfile((value) => !value);
                  setProfileNotice({ error: "", success: "" });
                }}
              >
                {isEditingProfile ? "Close editor" : "Edit user"}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={isDeletingUser}
                onClick={removeUser}
              >
                {isDeletingUser ? "Deleting..." : "Delete user"}
              </button>
            </div>
          ) : (
            <AuthorFollowButton
              author={profile}
              onFollowChange={() => {
                profileQuery.refetch();
                if (activeTab === "followers") followersQuery.refetch();
              }}
            />
          )}
        </div>
        <div className="public-profile-stats">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            aria-label={`${profile.post_count ?? 0} posts`}
          >
            <strong>{profile.post_count ?? 0}</strong>
            <span>Posts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("followers")}
            aria-label={`${profile.follower_count ?? 0} followers`}
          >
            <strong>{profile.follower_count ?? 0}</strong>
            <span>Followers</span>
          </button>
          <div>
            <strong>{profile.following_count ?? 0}</strong>
            <span>Following</span>
          </div>
          <div>
            <strong>{profile.rating ?? 0}</strong>
            <span>Reputation</span>
          </div>
        </div>
      </header>

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

      {isAdmin && isEditingProfile && (
        <section
          className="admin-profile-editor"
          aria-label="Edit user profile"
        >
          <div className="profile-section-heading">
            <h2>Edit user account</h2>
            <p>Changes apply to this account immediately.</p>
          </div>
          <form className="profile-form" onSubmit={saveAdminProfile}>
            <label>
              Username
              <input
                value={profileForm.login}
                onChange={(event) =>
                  setProfileForm({ ...profileForm, login: event.target.value })
                }
                maxLength={32}
                required
              />
            </label>
            <label>
              Full name
              <input
                value={profileForm.full_name}
                onChange={(event) =>
                  setProfileForm({
                    ...profileForm,
                    full_name: event.target.value,
                  })
                }
                maxLength={100}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={profileForm.email}
                onChange={(event) =>
                  setProfileForm({ ...profileForm, email: event.target.value })
                }
                required
              />
            </label>
            <label>
              Account role
              <select
                value={profileForm.role}
                onChange={(event) =>
                  setProfileForm({ ...profileForm, role: event.target.value })
                }
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="admin-profile-editor__checkbox">
              <input
                type="checkbox"
                checked={profileForm.email_confirmed}
                onChange={(event) =>
                  setProfileForm({
                    ...profileForm,
                    email_confirmed: event.target.checked,
                  })
                }
              />
              Email address is confirmed
            </label>
            <div className="profile-form__divider">
              <span>Reset password</span>
              <small>
                Leave both fields empty to keep the current password.
              </small>
            </div>
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={profileForm.password}
                onChange={(event) =>
                  setProfileForm({
                    ...profileForm,
                    password: event.target.value,
                  })
                }
                minLength={8}
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                value={profileForm.password_confirmation}
                onChange={(event) =>
                  setProfileForm({
                    ...profileForm,
                    password_confirmation: event.target.value,
                  })
                }
                minLength={8}
              />
            </label>
            <div className="profile-form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "Saving..." : "Save account"}
              </button>
            </div>
          </form>
          <form className="profile-avatar-form" onSubmit={uploadAdminAvatar}>
            <label>
              Change profile picture
              <input
                type="file"
                name="avatar"
                accept="image/jpeg,image/png,image/gif,image/webp"
                disabled={isUploadingAvatar}
              />
            </label>
            <small>JPG, PNG, GIF or WEBP. Maximum file size: 5 MB.</small>
            <div className="profile-form-actions">
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? "Uploading..." : "Upload picture"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="public-profile-content" aria-label="Author activity">
        <nav
          className="public-profile-tabs"
          aria-label="Author profile sections"
        >
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={`public-profile-tab${activeTab === tab.id ? " is-active" : ""}`}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              <span>{tab.count ?? 0}</span>
            </button>
          ))}
        </nav>

        {activeTab === "posts" && (
          <div className="public-profile-list">
            {postsQuery.isLoading ? (
              <p role="status">Loading posts...</p>
            ) : postsQuery.isError ? (
              <ProfileError
                error={postsQuery.error}
                fallback="Posts could not be loaded."
                onRetry={postsQuery.refetch}
              />
            ) : posts.length === 0 ? (
              <div className="public-profile-empty">
                <h2>No public posts yet</h2>
                <p>
                  When this author publishes, their posts will show up here.
                </p>
              </div>
            ) : (
              <>
                {postError && (
                  <p className="error-message" role="alert">
                    {postError}
                  </p>
                )}
                {posts.map((post) => (
                  <div
                    className={
                      isAdmin
                        ? "public-profile-managed-post"
                        : "public-profile-post"
                    }
                    key={post.id}
                  >
                    <PostPreview post={post} />
                    {isAdmin && (
                      <div className="profile-post-card__actions public-profile-admin-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setPostError("");
                            setPostNotice("");
                            setEditingPost({
                              id: post.id,
                              title: post.title,
                              content: post.content,
                              status: post.status,
                              categories: (post.categories ?? []).map(
                                (category) => String(category.id),
                              ),
                            });
                          }}
                        >
                          Edit post
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={isDeletingPost}
                          onClick={() => removePost(post)}
                        >
                          {isDeletingPost ? "Deleting..." : "Delete post"}
                        </button>
                      </div>
                    )}
                    {isAdmin && editingPost?.id === post.id && (
                      <form className="profile-edit-form" onSubmit={savePost}>
                        <label>
                          Post title
                          <input
                            value={editingPost.title}
                            onChange={(event) =>
                              setEditingPost({
                                ...editingPost,
                                title: event.target.value,
                              })
                            }
                            maxLength={255}
                            required
                          />
                        </label>
                        <label>
                          Post content
                          <textarea
                            value={editingPost.content}
                            onChange={(event) =>
                              setEditingPost({
                                ...editingPost,
                                content: event.target.value,
                              })
                            }
                            rows={6}
                            maxLength={10000}
                            required
                          />
                        </label>
                        <label>
                          Post status
                          <select
                            value={editingPost.status}
                            onChange={(event) =>
                              setEditingPost({
                                ...editingPost,
                                status: event.target.value,
                              })
                            }
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </label>
                        <fieldset className="profile-category-picker">
                          <legend>Categories</legend>
                          {categoriesForEditQuery.isError ? (
                            <p role="alert">Could not load categories.</p>
                          ) : (
                            (categoriesForEditQuery.data ?? []).map(
                              (category) => {
                                const id = String(category.id);
                                const selected =
                                  editingPost.categories.includes(id);
                                return (
                                  <button
                                    type="button"
                                    key={id}
                                    className={`profile-chip-button${selected ? " is-selected" : ""}`}
                                    aria-pressed={selected}
                                    onClick={() =>
                                      setEditingPost({
                                        ...editingPost,
                                        categories: selected
                                          ? editingPost.categories.filter(
                                              (categoryId) => categoryId !== id,
                                            )
                                          : [...editingPost.categories, id],
                                      })
                                    }
                                  >
                                    {category.title}
                                  </button>
                                );
                              },
                            )
                          )}
                        </fieldset>
                        {postNotice && (
                          <p className="error-message" role="alert">
                            {postNotice}
                          </p>
                        )}
                        <div className="profile-form-actions">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={isSavingPost}
                            onClick={() => setEditingPost(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSavingPost}
                          >
                            {isSavingPost ? "Saving..." : "Save post"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
                <Pagination
                  page={postPage}
                  totalPages={postsQuery.data?.pagination?.total_pages ?? 1}
                  onChange={setPostPage}
                />
              </>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="public-profile-list">
            {commentsQuery.isLoading ? (
              <p role="status">Loading comments...</p>
            ) : commentsQuery.isError ? (
              <ProfileError
                error={commentsQuery.error}
                fallback="Comments could not be loaded."
                onRetry={commentsQuery.refetch}
              />
            ) : comments.length === 0 ? (
              <div className="public-profile-empty">
                <h2>No public comments yet</h2>
                <p>Comments on active posts will appear here.</p>
              </div>
            ) : (
              <>
                {comments.map((comment) =>
                  isAdmin ? (
                    <AdminCommentCard
                      key={comment.id}
                      comment={comment}
                      onRefresh={() => {
                        commentsQuery.refetch();
                        profileQuery.refetch();
                      }}
                    />
                  ) : (
                    <article className="public-comment-card" key={comment.id}>
                      <div className="public-comment-card__meta">
                        <span>{formatDate(comment.created_at)}</span>
                        <span>·</span>
                        <span>{comment.likes_count ?? 0} likes</span>
                      </div>
                      <p>{comment.content}</p>
                      <Link to={`/posts/${comment.post_id}`}>
                        On: {comment.post_title}
                      </Link>
                    </article>
                  ),
                )}
                <Pagination
                  page={commentPage}
                  totalPages={commentsQuery.data?.pagination?.total_pages ?? 1}
                  onChange={setCommentPage}
                />
              </>
            )}
          </div>
        )}

        {activeTab === "categories" && (
          <div className="public-profile-list">
            {categoryNotice && (
              <p className="error-message" role="alert">
                {categoryNotice}
              </p>
            )}
            {categoriesQuery.isLoading ? (
              <p role="status">Loading topics...</p>
            ) : categoriesQuery.isError ? (
              <ProfileError
                error={categoriesQuery.error}
                fallback="Topics could not be loaded."
                onRetry={categoriesQuery.refetch}
              />
            ) : categories.length === 0 ? (
              <div className="public-profile-empty">
                <h2>No topics created yet</h2>
                <p>Topics created by this author will appear here.</p>
              </div>
            ) : (
              <div className="public-category-grid">
                {categories.map((category) => (
                  <article className="public-category-card" key={category.id}>
                    {editingCategory?.id === category.id ? (
                      <form
                        className="profile-edit-form"
                        onSubmit={saveCategory}
                      >
                        <label>
                          Topic title
                          <input
                            value={editingCategory.title}
                            onChange={(event) =>
                              setEditingCategory({
                                ...editingCategory,
                                title: event.target.value,
                              })
                            }
                            maxLength={255}
                            required
                          />
                        </label>
                        <label>
                          Description
                          <textarea
                            value={editingCategory.description}
                            onChange={(event) =>
                              setEditingCategory({
                                ...editingCategory,
                                description: event.target.value,
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
                            onClick={() => setEditingCategory(null)}
                            disabled={isSavingCategory}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSavingCategory}
                          >
                            {isSavingCategory ? "Saving..." : "Save topic"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h2>{category.title}</h2>
                        <p>
                          {category.description ||
                            "A community topic created by this author."}
                        </p>
                        <span>
                          {category.posts_count ?? 0}{" "}
                          {(category.posts_count ?? 0) === 1 ? "post" : "posts"}
                        </span>
                        {isAdmin && (
                          <div className="profile-post-card__actions">
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => {
                                setCategoryNotice("");
                                setEditingCategory({
                                  id: category.id,
                                  title: category.title,
                                  description: category.description ?? "",
                                });
                              }}
                            >
                              Edit topic
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={isDeletingCategory}
                              onClick={() => removeCategory(category)}
                            >
                              {isDeletingCategory
                                ? "Deleting..."
                                : "Delete topic"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "followers" && (
          <div className="public-profile-list">
            {followersQuery.isLoading ? (
              <p role="status">Loading followers...</p>
            ) : followersQuery.isError ? (
              <ProfileError
                error={followersQuery.error}
                fallback="Followers could not be loaded."
                onRetry={followersQuery.refetch}
              />
            ) : followers.length === 0 ? (
              <div className="public-profile-empty">
                <h2>No followers yet</h2>
                <p>When people follow this author, they will appear here.</p>
              </div>
            ) : (
              <>
                <div className="public-follower-list">
                  {followers.map((follower) => (
                    <article className="public-follower-card" key={follower.id}>
                      <Link
                        to={`/users/${follower.id}`}
                        className="public-follower-card__identity"
                      >
                        <span
                          className="public-follower-avatar"
                          aria-hidden="true"
                        >
                          {(follower.full_name || follower.login || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <span>
                          <strong>
                            {follower.full_name || follower.login}
                          </strong>
                          <small>@{follower.login}</small>
                        </span>
                      </Link>
                      <AuthorFollowButton author={follower} compact />
                    </article>
                  ))}
                </div>
                <Pagination
                  page={followerPage}
                  totalPages={followersQuery.data?.pagination?.total_pages ?? 1}
                  onChange={setFollowerPage}
                />
              </>
            )}
          </div>
        )}
      </section>
    </section>
  );
}
