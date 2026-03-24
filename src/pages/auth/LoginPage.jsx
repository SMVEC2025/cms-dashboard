import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { APP_NAME } from '@/lib/constants';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import SetupAlert from '@/components/common/SetupAlert';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isSupabaseConfigured) {
      return;
    }

    try {
      setSubmitting(true);
      const profile = await signIn({ email, password });
      const destination = profile?.selected_college_id ? location.state?.from?.pathname || '/' : '/select-college';
      navigate(destination, { replace: true });
      toast.success('Welcome back.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left — Illustration panel */}
      <div className="login-page__art">
        <div className="login-page__art-content">
          <h2 className="login-page__art-heading">
            Effortlessly manage your editorial workspace.
          </h2>
          <p className="login-page__art-desc">
            Sign in to access your dashboard and manage your content across colleges.
          </p>

          {/* Floating dashboard mockup cards */}
          <div className="login-page__mockup">
            <div className="login-page__mockup-card login-page__mockup-card--main">
              <div className="login-page__mockup-header">
                <span className="login-page__mockup-dot" />
                <span className="login-page__mockup-dot" />
                <span className="login-page__mockup-dot" />
              </div>
              <div className="login-page__mockup-body">
                <div className="login-page__mockup-stat">
                  <span className="login-page__mockup-stat-label">Total Posts</span>
                  <span className="login-page__mockup-stat-value">1,248</span>
                </div>
                <div className="login-page__mockup-stat">
                  <span className="login-page__mockup-stat-label">Published</span>
                  <span className="login-page__mockup-stat-value">892</span>
                </div>
                <div className="login-page__mockup-bars">
                  <div className="login-page__mockup-bar" style={{ height: '60%' }} />
                  <div className="login-page__mockup-bar" style={{ height: '85%' }} />
                  <div className="login-page__mockup-bar" style={{ height: '45%' }} />
                  <div className="login-page__mockup-bar" style={{ height: '70%' }} />
                  <div className="login-page__mockup-bar" style={{ height: '90%' }} />
                  <div className="login-page__mockup-bar" style={{ height: '55%' }} />
                </div>
              </div>
            </div>
            <div className="login-page__mockup-card login-page__mockup-card--float">
              <div className="login-page__mockup-mini-chart">
                <svg viewBox="0 0 120 40" fill="none">
                  <path d="M0 35 Q20 10 40 25 T80 15 T120 20" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" />
                  <path d="M0 35 Q20 10 40 25 T80 15 T120 20 L120 40 L0 40Z" fill="rgba(255,255,255,0.1)" />
                </svg>
              </div>
              <span className="login-page__mockup-mini-label">Growth</span>
              <span className="login-page__mockup-mini-value">+24%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="login-page__form-side">
        <div className="login-page__form-wrap">
          <div className="login-page__brand">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="var(--primary)" />
              <path d="M10 22V10h4.5c1.2 0 2.1.3 2.8.9.7.6 1 1.4 1 2.3 0 .7-.2 1.2-.5 1.7-.3.4-.8.7-1.3.9.6.1 1.1.5 1.5 1 .4.5.6 1.1.6 1.8 0 1-.3 1.8-1 2.4-.7.6-1.6.9-2.8.9H10zm2.3-7h2.2c.6 0 1.1-.2 1.4-.5.4-.3.5-.8.5-1.3 0-.5-.2-1-.5-1.3-.3-.3-.8-.5-1.4-.5h-2.2v3.6zm0 5.2h2.5c.6 0 1.1-.2 1.5-.5.4-.4.5-.8.5-1.4 0-.6-.2-1-.5-1.4-.4-.3-.9-.5-1.5-.5h-2.5v3.8z" fill="#fff"/>
            </svg>
            <span className="login-page__brand-name">{APP_NAME}</span>
          </div>

          <h1 className="login-page__title">Welcome Back</h1>
          <p className="login-page__subtitle">Enter your email and password to access your account.</p>

          {!isSupabaseConfigured && <SetupAlert />}

          <form className="login-page__form" onSubmit={handleSubmit}>
            <div className="login-page__field-group">
              <label className="login-page__label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="user@company.com"
                disabled={!isSupabaseConfigured || submitting}
                required
              />
            </div>

            <div className="login-page__field-group">
              <label className="login-page__label" htmlFor="login-password">Password</label>
              <div className="login-page__password-wrap">
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  disabled={!isSupabaseConfigured || submitting}
                  required
                />
              </div>
            </div>

            <div className="login-page__options">
              <label className="login-page__remember">
                <input type="checkbox" />
                <span>Remember Me</span>
              </label>
              <a href="#" className="login-page__forgot-link" onClick={(e) => e.preventDefault()}>
                Forgot Your Password?
              </a>
            </div>

            <button type="submit" className="login-page__submit" disabled={!isSupabaseConfigured || submitting}>
              {submitting ? (
                <>
                  <span className="login-page__submit-spinner" />
                  Signing in...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>

          <p className="login-page__footer-text">
            Don&apos;t Have An Account? <a href="#" onClick={(e) => e.preventDefault()}>Register Now.</a>
          </p>
        </div>

        <div className="login-page__copyright">
          <span>&copy; {new Date().getFullYear()} {APP_NAME}.</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
