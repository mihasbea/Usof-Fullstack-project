export function Button({ children, variant = 'primary', type = 'button' }) {
    return (<button type={type} className={`btn btn-${variant}`}>
      {children}
    </button>);
}
