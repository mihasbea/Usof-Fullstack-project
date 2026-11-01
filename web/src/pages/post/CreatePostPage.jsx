import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCreatePostMutation, useGetCategoriesQuery } from '../../features/posts/postsApi';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime', 'application/pdf',
];

const fileKey = (f) => `${f.name}-${f.size}-${f.lastModified}`;
const formatSize = (bytes) =>
    bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

export function CreatePostPage() {
    const navigate = useNavigate();
    const { data: categories = [], isLoading: categoriesLoading, isError: categoriesError } =
        useGetCategoriesQuery();
    const [createPost, { isLoading: isSubmitting }] = useCreatePostMutation();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryIds, setCategoryIds] = useState([]);
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const next = files.map((file) => ({
            file,
            url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        }));
        setPreviews(next);
        return () => next.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    }, [files]);

    const toggleCategory = (id) =>
        setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const handleFiles = (event) => {
        const picked = [...event.target.files];
        event.target.value = '';
        setError('');

        const known = new Set(files.map(fileKey));
        const fresh = picked.filter((f) => !known.has(fileKey(f)));

        if (fresh.some((f) => !ALLOWED_TYPES.includes(f.type))) {
            setError('Allowed files: JPG, PNG, GIF, WEBP, MP4, WEBM, MOV, PDF.');
            return;
        }
        if (fresh.some((f) => f.size > MAX_FILE_SIZE)) {
            setError('Each file must be no larger than 50 MB.');
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
        setError('');

        if (!title.trim()) return setError('Please enter a title.');
        if (!content.trim()) return setError('Please write something in the post.');
        if (categoryIds.length === 0) return setError('Choose at least one category.');

        const body = new FormData();
        body.set('title', title.trim());
        body.set('content', content.trim());
        body.set('categories', categoryIds.join(','));
        files.forEach((file) => body.append('attachments', file));

        try {
            const result = await createPost(body).unwrap();
            navigate(`/posts/${result.post_id}`);
        } catch (err) {
            setError(err?.data?.message || 'Could not create the post. Please try again.');
        }
    };

    return (
        <section className="page-block create-post">
            <Link to="/" className="post-back-link">← Back to posts</Link>
            <p className="eyebrow">New post</p>
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
                    {categoriesLoading ? (
                        <p className="category-status">Loading categories...</p>
                    ) : categoriesError ? (
                        <p className="category-status" role="alert">Could not load categories.</p>
                    ) : (
                        <div className="category-filter-list">
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    className={`category-filter${categoryIds.includes(category.id) ? ' active' : ''}`}
                                    aria-pressed={categoryIds.includes(category.id)}
                                    onClick={() => toggleCategory(category.id)}
                                    disabled={isSubmitting}
                                >
                                    {category.title}
                                </button>
                            ))}
                        </div>
                    )}
                </fieldset>

                <div className="create-post-field">
                    <span>Attachments <small>(up to 10 files, 50 MB each)</small></span>
                    <label className="create-post-dropzone">
                        <input
                            type="file"
                            multiple
                            accept={ALLOWED_TYPES.join(',')}
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
                                            {file.type === 'application/pdf' ? 'PDF' : 'VIDEO'}
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

                {error && <p className="error-message" role="alert">{error}</p>}

                <div className="create-post-actions">
                    <Link to="/" className="btn btn-secondary">Cancel</Link>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Publishing...' : 'Publish post'}
                    </button>
                </div>
            </form>
        </section>
    );
}