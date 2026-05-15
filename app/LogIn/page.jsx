'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, LogIn } from 'lucide-react';
import {
  getCurrentPortalUser,
  getPortalHomeRoute,
  INACTIVE_ACCOUNT_MESSAGE,
  isInactivePortalUser,
  signInPortal,
  signOutPortal,
  updatePortalPassword,
} from '@/lib/auth/portalAuth';
import './login.css';

const authLoadingCopy = {
  signin: 'Securing portal access...',
  reset: 'Updating secure password...',
  redirect: 'Redirecting to portal...',
};

const REMEMBERED_EMAIL_KEY = 'mempco.portal.rememberedEmail';

const AuthButtonIcon = ({ icon: IconComponent }) => (
  <IconComponent className="auth-button-icon" aria-hidden="true" />
);

function AuthLoadingOverlay({ label }) {
  return (
    <div className="auth-loading-overlay" role="status" aria-live="polite" aria-label={label}>
      <div className="auth-loading-logo-wrap" aria-hidden="true">
        <img src="/Logos/Logo.png" alt="" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [authMode, setAuthMode] = useState('signin');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState(authLoadingCopy.signin);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const redirectToRoute = (route = '/') => {
    const destination = String(route || '/').startsWith('/') ? route : '/';

    setIsRedirecting(true);
    setLoadingLabel(authLoadingCopy.redirect);

    window.setTimeout(() => {
      window.location.replace(destination);
    }, 350);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);

    if (rememberedEmail) {
      setRememberMe(true);
      setLoginForm((prev) => ({
        ...prev,
        email: rememberedEmail,
      }));
    }

    if (params.get('mode') === 'reset') {
      setAuthMode('reset');
      setMessage({
        type: 'success',
        text: 'Enter a new password for your portal account.',
      });
      return;
    }

    if (params.get('auth_error') === 'setup') {
      setMessage({
        type: 'error',
        text: 'Supabase is not configured yet. Add your environment variables and run the schema SQL first.',
      });
    }
  }, []);

  const updateLogin = (field, value) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRememberMeChange = (checked) => {
    setRememberMe(checked);

    if (!checked) {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (isSubmitting || isRedirecting) return;

    setIsSubmitting(true);
    setLoadingLabel(authLoadingCopy.signin);
    setMessage({ type: '', text: '' });

    try {
      const user = await signInPortal(loginForm);
      const email = loginForm.email.trim();

      if (rememberMe && email) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      if (isInactivePortalUser(user)) {
        await signOutPortal().catch(() => {});
        setMessage({
          type: 'error',
          text: INACTIVE_ACCOUNT_MESSAGE,
        });

        window.setTimeout(() => {
          window.location.replace('/');
        }, 5000);

        return;
      }

      const destination = getPortalHomeRoute(user.role);

      setMessage({
        type: 'success',
        text: 'Login successful. Redirecting...',
      });

      redirectToRoute(destination);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Unable to login. Please try again.',
      });
      setIsRedirecting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (isSubmitting || isRedirecting) return;

    if (resetForm.password !== resetForm.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Password and confirm password do not match.',
      });
      return;
    }

    setIsSubmitting(true);
    setLoadingLabel(authLoadingCopy.reset);
    setMessage({ type: '', text: '' });

    try {
      await updatePortalPassword(resetForm.password);
      const user = await getCurrentPortalUser();

      if (isInactivePortalUser(user)) {
        await signOutPortal().catch(() => {});
        setMessage({
          type: 'error',
          text: INACTIVE_ACCOUNT_MESSAGE,
        });

        window.setTimeout(() => {
          window.location.replace('/');
        }, 5000);

        return;
      }

      const destination = getPortalHomeRoute(user?.role);

      setMessage({
        type: 'success',
        text: 'Password updated. Redirecting...',
      });

      redirectToRoute(destination);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Unable to update password.',
      });
      setIsRedirecting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setMessage({ type: '', text: '' });
  };

  const isBusy = isSubmitting || isRedirecting;

  return (
    <>
      <main className="portal-main portal-auth-main">
        <section className="auth-section">
          <div className={`auth-shell ${authMode === 'reset' ? 'reset-mode' : ''}`}>
            <div className="auth-showcase" aria-hidden="true">
              <div className="auth-showcase-inner">
                <img
                  src="/Logos/LOGO 1.png"
                  alt="MEMPCO Logo"
                  className="auth-company-logo"
                />

                <div className="auth-showcase-copy">
                  <span>MEMPCO Employee Access</span>
                  <p>
                    Internal helpdesk portal for employee support, admin action,
                    and technical concern tracking.
                  </p>
                </div>
              </div>
            </div>

            <div className="auth-panel">
              <div className="auth-panel-inner">
                {message.text && (
                  <div className={`auth-alert ${message.type}`}>
                    {message.text}
                  </div>
                )}

                <div className="auth-forms">
                  <form
                    onSubmit={handleLogin}
                    className={`auth-form signin-form ${authMode === 'signin' ? 'active' : ''}`}
                  >
                    <div className="auth-form-head">
                      <span className="auth-kicker">Employee / Admin Portal</span>
                      <h2>Secure dashboard access</h2>
                      <p>Login using your MEMPCO employee or admin account.</p>
                    </div>

                    <div className="form-grid single">
                      <div className="form-group">
                        <label htmlFor="login-email">Email Address</label>
                        <input
                          id="login-email"
                          type="email"
                          required
                          placeholder="Enter your email"
                          value={loginForm.email}
                          onChange={(e) => updateLogin('email', e.target.value)}
                          disabled={isBusy}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="login-password">Password</label>
                        <div className="password-field">
                          <input
                            id="login-password"
                            type={showLoginPassword ? 'text' : 'password'}
                            required
                            placeholder="Enter your password"
                            value={loginForm.password}
                            onChange={(e) => updateLogin('password', e.target.value)}
                            disabled={isBusy}
                          />
                          <button
                            type="button"
                            className="password-toggle"
                            aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showLoginPassword}
                            onClick={() => setShowLoginPassword((current) => !current)}
                            disabled={isBusy}
                          >
                            {showLoginPassword ? (
                              <EyeOff className="password-toggle-icon" aria-hidden="true" />
                            ) : (
                              <Eye className="password-toggle-icon" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="auth-form-row">
                      <label className="remember-me">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => handleRememberMeChange(e.target.checked)}
                          disabled={isBusy}
                        />
                        <span>Remember me</span>
                      </label>
                    </div>

                    <button type="submit" className="auth-submit-btn login-submit-btn" disabled={isBusy}>
                      <AuthButtonIcon icon={LogIn} />
                      {isBusy ? 'Please wait...' : 'Login to Portal'}
                    </button>

                    <p className="auth-switch-text">
                      Need access? Request account creation from the MEMPCO admin office.
                    </p>
                  </form>

                  <form
                    onSubmit={handleUpdatePassword}
                    className={`auth-form reset-form ${authMode === 'reset' ? 'active' : ''}`}
                  >
                    <div className="auth-form-head">
                      <span className="auth-kicker">Password Reset</span>
                      <h2>Create a new password</h2>
                      <p>Use at least 8 characters for your MEMPCO portal password.</p>
                    </div>

                    <div className="form-grid single">
                      <div className="form-group">
                        <label htmlFor="reset-password">New Password</label>
                        <input
                          id="reset-password"
                          type="password"
                          required
                          placeholder="Enter new password"
                          value={resetForm.password}
                          onChange={(e) =>
                            setResetForm((prev) => ({ ...prev, password: e.target.value }))
                          }
                          disabled={isBusy}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="reset-confirm-password">Confirm Password</label>
                        <input
                          id="reset-confirm-password"
                          type="password"
                          required
                          placeholder="Confirm new password"
                          value={resetForm.confirmPassword}
                          onChange={(e) =>
                            setResetForm((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          disabled={isBusy}
                        />
                      </div>
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={isBusy}>
                      <AuthButtonIcon icon={CheckCircle2} />
                      {isBusy ? 'Please wait...' : 'Update Password'}
                    </button>

                    <p className="auth-switch-text">
                      Return to{' '}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => switchMode('signin')}
                        disabled={isBusy}
                      >
                        sign in
                      </button>
                    </p>
                  </form>
                </div>

                <p className="auth-bottom-note">
                  Accounts are created only by authorized MEMPCO administrators.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {isBusy && <AuthLoadingOverlay label={loadingLabel} />}
    </>
  );
}
