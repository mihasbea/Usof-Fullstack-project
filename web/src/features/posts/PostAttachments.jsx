const isImage = (type = '') => type === 'image' || type.startsWith('image/');
const fileName = (path) => path.split(/[\\/]/).pop();
const API_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3000';

export function attachmentUrl(filePath) {
    if (/^https?:\/\//.test(filePath)) return filePath;
    return `${API_URL}/${filePath.replace(/^\/+/, '')}`;
}

export function PostAttachments({ attachments = [], limit, asLinks = true }) {
    if (attachments.length === 0) return null;

    const visible = limit ? attachments.slice(0, limit) : attachments;
    const hidden = attachments.length - visible.length;

    return (
        <div className="post-attachments">
            {visible.map((file) => {
                const url = attachmentUrl(file.file_path);
                const content = isImage(file.file_type) ? (
                    <img src={url} alt="" loading="lazy" className="post-attachments__image" />
                ) : (
                    <span className="post-attachments__file">{fileName(file.file_path)}</span>
                );

                return asLinks ? (
                    <a key={file.id} href={url} target="_blank" rel="noreferrer">{content}</a>
                ) : (
                    <span key={file.id}>{content}</span>
                );
            })}
            {hidden > 0 && <span className="post-attachments__more">+{hidden} more</span>}
        </div>
    );
}