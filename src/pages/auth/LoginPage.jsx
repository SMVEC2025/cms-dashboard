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
      const isAdmin = profile?.role === 'admin';
      const hasCollege = Boolean(profile?.selected_college_id);
      const destination = (isAdmin || hasCollege)
        ? location.state?.from?.pathname || '/'
        : '/select-college';
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
          <span className="login-page__art-chip">Institutional Publishing Suite</span>
          <img className="logo-img" src="/whitelogo.png" alt="SMVEC CMS logo" />

          <h2 className="login-page__art-heading">
            SMVEC CMS
          </h2>
          <p className="login-page__art-desc">
            Sign in to access your dashboard and manage your content across colleges.
          </p>

          <div className="login-page__art-metrics">
            <article className="login-page__art-metric-card">
              <p className="login-page__art-metric-label">Publishing Velocity</p>
              <strong className="login-page__art-metric-value">5x Faster</strong>
              <span className="login-page__art-metric-note">Draft-to-live workflow for distributed teams.</span>
            </article>

            <article className="login-page__art-metric-card login-page__art-metric-card--accent">
              <p className="login-page__art-metric-label">Campus Reach</p>
              <strong className="login-page__art-metric-value">14 Institutions</strong>
              <span className="login-page__art-metric-note">Unified workspace with role-based access control.</span>
            </article>
          </div>

          <div className="login-page__art-strip">
            <div className="login-page__art-strip-item">
              <span className="login-page__art-strip-dot" />
              <span>Approval-ready publishing pipeline</span>
            </div>
            <div className="login-page__art-strip-item">
              <span className="login-page__art-strip-dot" />
              <span>Centralized media and document import</span>
            </div>
            <div className="login-page__art-strip-item">
              <span className="login-page__art-strip-dot" />
              <span>College-specific dashboards and analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="login-page__form-side">
        <div className="login-page__form-wrap">


          <h1 className="login-page__title">Welcome Back</h1>

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
