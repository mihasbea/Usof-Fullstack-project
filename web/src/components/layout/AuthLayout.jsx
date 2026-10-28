import { Link } from 'react-router-dom';

export function AuthLayout({ children }) {
    return (
        <div className="auth-page">
            <header className="auth-topbar">
                <Link to="/login" className="brand auth-brand" aria-label="USOF home">
                    USOF<span className="brand-mark">;</span>
                </Link>
            </header>

            <main className="auth-main">
                <aside className="auth-visual" aria-label="Developer community">
                    <div className="auth-sparks" aria-hidden="true">
                        <span className="auth-spark auth-spark--one" />
                        <span className="auth-spark auth-spark--two" />
                        <span className="auth-spark auth-spark--three" />
                        <span className="auth-spark auth-spark--four" />
                        <span className="auth-spark auth-spark--five" />
                        <span className="auth-spark auth-spark--six" />
                        <span className="auth-spark auth-spark--seven" />
                        <span className="auth-spark auth-spark--eight" />
                    </div>
                    <div className="auth-visual-copy">
                        <span className="auth-visual-kicker">YOUR SOLUTION LAYS HERE</span>
                        <h2>Put knowledge<br />to use.</h2>
                        <p>USOF Forum</p>
                    </div>
                </aside>
                <section className="auth-content">
                    {children}
                    <p className="auth-legal">A welcoming space to share ideas and learn together.</p>
                </section>
            </main>
        </div>
    );
}
