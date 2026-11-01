const ICON_BASE = `${process.env.PUBLIC_URL ?? ''}/assets/icons`;

const ICONS = {
    like: {
        idle: `${ICON_BASE}/like.png`,
        active: `${ICON_BASE}/like_pressed.png`,
        label: 'Like',
    },
    dislike: {
        idle: `${ICON_BASE}/dislike.png`,
        active: `${ICON_BASE}/dislike_pressed.png`,
        label: 'Dislike',
    },
};

export function VoteButton({ type, active = false, count = 0, disabled = false, onClick }) {
    const { idle, active: activeIcon, label } = ICONS[type];

    return (
        <button
            type="button"
            className={`vote-btn vote-btn--${type}${active ? ' is-active' : ''}`}
            aria-pressed={active}
            aria-label={`${label} (${count})`}
            disabled={disabled}
            onClick={onClick}
        >
            <img src={active ? activeIcon : idle} alt="" className="vote-btn__icon" />
            <span className="vote-btn__count">{count}</span>
        </button>
    );
}