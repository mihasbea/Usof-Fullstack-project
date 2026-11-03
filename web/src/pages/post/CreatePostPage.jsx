import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { BackChevron } from "../../components/layout/BackChevron";
import { useCreateCategoryMutation } from "../../features/profile/profileApi";
import {
  postsApi,
  useCreatePostMutation,
  useSearchCategoriesQuery,
} from "../../features/posts/postsApi";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
];

const fileKey = (f) => `${f.name}-${f.size}-${f.lastModified}`;
const formatSize = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;

export function CreatePostPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [categorySearch, setCategorySearch] = useState("");
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);
  const {
    data: categoryResponse,
    isLoading: categoriesLoading,
    isError: categoriesError,
    isFetching: categoriesFetching,
  } = useSearchCategoriesQuery({
    search: debouncedCategorySearch,
    page: categoryPage,
    limit: 12,
  });
  const categories = categoryResponse?.data ?? [];
  const categoryPagination = categoryResponse?.pagination;
  const [createPost, { isLoading: isSubmitting }] = useCreatePostMutation();
  const [createCategory, { isLoading: isCreatingCategory }] =
    useCreateCategoryMutation();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [categoryCreateError, setCategoryCreateError] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedCategorySearch(categorySearch.trim()),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [categorySearch]);

  useEffect(() => {
    const next = files.map((file) => ({
      file,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setPreviews(next);
    return () => next.forEach((p) => p.url && URL.revokeObjectURL(p.url));
  }, [files]);

  const toggleCategory = (category) =>
    setSelectedCategories((previous) =>
      previous.some((item) => String(item.id) === String(category.id))
        ? previous.filter((item) => String(item.id) !== String(category.id))
        : [...previous, category],
    );

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    setCategoryCreateError("");
    try {
      const result = await createCategory({
        title: newCategoryTitle.trim(),
        description: newCategoryDescription.trim() || null,
      }).unwrap();
      const category = result.category;
      setSelectedCategories((previous) => [...previous, category]);
      setNewCategoryTitle("");
      setNewCategoryDescription("");
      setShowCategoryForm(false);
      dispatch(postsApi.util.invalidateTags(["Categories"]));
    } catch (createError) {
      setCategoryCreateError(
        createError?.data?.message || "Could not create this category.",
      );
    }
  };

  const handleFiles = (event) => {
    const picked = [...event.target.files];
    event.target.value = "";
    setError("");

    const known = new Set(files.map(fileKey));
    const fresh = picked.filter((f) => !known.has(fileKey(f)));

    if (fresh.some((f) => !ALLOWED_TYPES.includes(f.type))) {
      setError("Allowed files: JPG, PNG, GIF, WEBP, MP4, WEBM, MOV, PDF.");
      return;
    }
    if (fresh.some((f) => f.size > MAX_FILE_SIZE)) {
      setError("Each file must be no larger than 50 MB.");
      return;
    }
    if (files.length + fresh.length > MAX_FILES) {
      setError(`You can attach no more than ${MAX_FILES} files.`);
      return;
    }
    setFiles([...files, ...fresh]);
  };

  const removeFile = (index) => setFiles(files.filter((_, i) => i !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!title.trim()) return setError("Please enter a title.");
    if (!content.trim()) return setError("Please write something in the post.");
    if (selectedCategories.length === 0)
      return setError("Choose at least one category.");

    const body = new FormData();
    body.set("title", title.trim());
    body.set("content", content.trim());
    body.set(
      "categories",
      selectedCategories.map((category) => category.id).join(","),
    );
    files.forEach((file) => body.append("attachments", file));

    try {
      const result = await createPost(body).unwrap();
      navigate(`/posts/${result.post_id}`);
    } catch (err) {
      setError(
        err?.data?.message || "Could not create the post. Please try again.",
      );
    }
  };

  return (
    <section className="page-block create-post">
      <Link to="/" className="post-back-link">
        <BackChevron /> Back to posts
      </Link>
      <h2>Create a post</h2>

      <form className="create-post-form" onSubmit={handleSubmit}>
        <label className="create-post-field">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            placeholder="What is your post about?"
            disabled={isSubmitting}
          />
          <small>{title.length}/255</small>
        </label>

        <label className="create-post-field">
          <span>Content</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={9}
            placeholder="Describe your question or share your thoughts..."
            disabled={isSubmitting}
          />
        </label>

        <fieldset className="create-post-field">
          <legend>Categories</legend>
          <label className="category-picker-search">
            <span className="sr-only">Search categories</span>
            <input
              type="search"
              value={categorySearch}
              onChange={(event) => {
                setCategorySearch(event.target.value);
                setCategoryPage(1);
              }}
              maxLength={255}
              placeholder="Search categories by name or creator"
              disabled={isSubmitting}
            />
          </label>
          {selectedCategories.length > 0 && (
            <div
              className="category-picker-selected"
              aria-label="Selected categories"
            >
              {selectedCategories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => toggleCategory(category)}
                  disabled={isSubmitting}
                  aria-label={`Remove ${category.title}`}
                >
                  {category.title} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
          {categoriesLoading ? (
            <p className="category-status">Loading categories...</p>
          ) : categoriesError ? (
            <p className="category-status" role="alert">
              Could not load categories.
            </p>
          ) : (
            <>
              {categories.length === 0 ? (
                <p className="category-status">No matching categories found.</p>
              ) : (
                <div
                  className={`category-filter-list${categoriesFetching ? " is-fetching" : ""}`}
                  aria-busy={categoriesFetching}
                >
                  {categories.map((category) => {
                    const isSelected = selectedCategories.some(
                      (item) => String(item.id) === String(category.id),
                    );
                    return (
                      <button
                        key={category.id}
                        type="button"
                        className={`category-filter category-picker-option${isSelected ? " active" : ""}`}
                        aria-pressed={isSelected}
                        onClick={() => toggleCategory(category)}
                        disabled={isSubmitting}
                        title={`Created by ${category.creator_full_name || category.creator_login || "USOF community"}`}
                      >
                        <strong>{category.title}</strong>
                        <small>
                          {category.creator_full_name ||
                            (category.creator_login
                              ? `@${category.creator_login}`
                              : "USOF community")}
                        </small>
                      </button>
                    );
                  })}
                </div>
              )}
              {categoryPagination?.total_pages > 1 && (
                <nav
                  className="category-picker-pagination"
                  aria-label="Category pages"
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={categoryPage <= 1 || categoriesFetching}
                    onClick={() => setCategoryPage((page) => page - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {categoryPage} of {categoryPagination.total_pages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={
                      categoryPage >= categoryPagination.total_pages ||
                      categoriesFetching
                    }
                    onClick={() => setCategoryPage((page) => page + 1)}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
          <button
            type="button"
            className="category-picker-create-toggle"
            aria-expanded={showCategoryForm}
            onClick={() => {
              setShowCategoryForm((visible) => !visible);
              setCategoryCreateError("");
            }}
            disabled={isSubmitting || isCreatingCategory}
          >
            {showCategoryForm
              ? "Cancel new category"
              : "+ Create your category"}
          </button>
          {showCategoryForm && (
            <form
              className="category-picker-create"
              onSubmit={handleCreateCategory}
            >
              <label>
                Category name
                <input
                  value={newCategoryTitle}
                  onChange={(event) => setNewCategoryTitle(event.target.value)}
                  maxLength={255}
                  required
                  disabled={isCreatingCategory}
                  placeholder="e.g. Frontend patterns"
                />
              </label>
              <label>
                Description <span>(optional)</span>
                <textarea
                  value={newCategoryDescription}
                  onChange={(event) =>
                    setNewCategoryDescription(event.target.value)
                  }
                  maxLength={1000}
                  rows={2}
                  disabled={isCreatingCategory}
                  placeholder="What belongs in this topic?"
                />
              </label>
              {categoryCreateError && (
                <p className="error-message" role="alert">
                  {categoryCreateError}
                </p>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isCreatingCategory}
              >
                {isCreatingCategory ? "Creating..." : "Create and select"}
              </button>
            </form>
          )}
        </fieldset>

        <div className="create-post-field">
          <span>
            Attachments <small>(up to 10 files, 50 MB each)</small>
          </span>
          <label className="create-post-dropzone">
            <input
              type="file"
              multiple
              accept={ALLOWED_TYPES.join(",")}
              onChange={handleFiles}
              disabled={isSubmitting || files.length >= MAX_FILES}
            />
            <strong>Click to add files</strong>
            <small>Images, videos or PDF</small>
          </label>

          {previews.length > 0 && (
            <ul className="create-post-files">
              {previews.map(({ file, url }, index) => (
                <li key={fileKey(file)} className="create-post-file">
                  {url ? (
                    <img src={url} alt="" />
                  ) : (
                    <span className="create-post-file__icon">
                      {file.type === "application/pdf" ? "PDF" : "VIDEO"}
                    </span>
                  )}
                  <span className="create-post-file__name">
                    {file.name}
                    <small>{formatSize(file.size)}</small>
                  </span>
                  <button
                    type="button"
                    className="create-post-file__remove"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeFile(index)}
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <div className="create-post-actions">
          <Link to="/" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Publishing..." : "Publish post"}
          </button>
        </div>
      </form>
    </section>
  );
}
