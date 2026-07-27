'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, LogIn } from 'lucide-react';
import {
  completeRequiredPasswordChange,
  getCurrentPortalUser,
  getPortalHomeRoute,
  INACTIVE_ACCOUNT_MESSAGE,
  isInactivePortalUser,
  isPasswordChangeRequired,
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
  const [forcedPasswordForm, setForcedPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [forcedPasswordUser, setForcedPasswordUser] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState(authLoadingCopy.signin);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showForcedPassword, setShowForcedPassword] = useState(false);

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
    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);

    if (params.get('mode') === 'force-password') {
      setMessage({
        type: 'success',
        text: 'Create a permanent password to continue.',
      });

      getCurrentPortalUser()
        .then((user) => {
          if (user && isPasswordChangeRequired(user)) {
            setForcedPasswordUser(user);
            return;
          }

          if (user) {
            redirectToRoute(getPortalHomeRoute(user.role));
          }
        })
        .catch(() => {});

      return;
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

  const handleLogin = async (e) => {
    e.preventDefault();

    if (isSubmitting || isRedirecting) return;

    setIsSubmitting(true);
    setLoadingLabel(authLoadingCopy.signin);
    setMessage({ type: '', text: '' });

    try {
      const user = await signInPortal(loginForm);
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);

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

      if (isPasswordChangeRequired(user)) {
        setForcedPasswordUser(user);
        setForcedPasswordForm({ password: '', confirmPassword: '' });
        setShowForcedPassword(false);
        setMessage({
          type: 'success',
          text: 'Temporary password accepted. Create a permanent password to continue.',
        });
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

  const handleRequiredPasswordChange = async (e) => {
    e.preventDefault();

    if (isSubmitting || isRedirecting) return;

    if (forcedPasswordForm.password !== forcedPasswordForm.confirmPassword) {
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
      const user = await completeRequiredPasswordChange(
        forcedPasswordForm.password,
        forcedPasswordForm.confirmPassword
      );

      if (isInactivePortalUser(user)) {
        await signOutPortal().catch(() => {});
        setForcedPasswordUser(null);
        setMessage({
          type: 'error',
          text: INACTIVE_ACCOUNT_MESSAGE,
        });

        window.setTimeout(() => {
          window.location.replace('/');
        }, 5000);

        return;
      }

      setForcedPasswordUser(null);
      setForcedPasswordForm({ password: '', confirmPassword: '' });
      setShowForcedPassword(false);
      setMessage({
        type: 'success',
        text: 'Password updated. Redirecting...',
      });

      redirectToRoute(getPortalHomeRoute(user?.role));
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

                <div className="auth-showcase-summary">
                  <span>Employee and Admin Access</span>
                  <strong>Helpdesk Operations Portal</strong>
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
                      <span className="auth-kicker">MEMPCO Portal</span>
                      <h2>Sign in</h2>
                      <p>Use your assigned account to open the staff dashboard.</p>
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

                    <button type="submit" className="auth-submit-btn login-submit-btn" disabled={isBusy}>
                      <AuthButtonIcon icon={LogIn} />
                      {isBusy ? 'Please wait...' : 'Sign In'}
                    </button>

                    <p className="auth-switch-text">
                      Need access? Contact the MEMPCO admin office.
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

              </div>
            </div>
          </div>
        </section>
      </main>

      {forcedPasswordUser && (
        <div className="forced-password-overlay" role="dialog" aria-modal="true" aria-label="Create permanent password">
          <form className="forced-password-modal" onSubmit={handleRequiredPasswordChange}>
            <div className="auth-form-head">
              <span className="auth-kicker">First Login Security</span>
              <h2>Create your permanent password</h2>
              <p>
                Your temporary password worked. Set a new password before opening the MEMPCO portal.
              </p>
            </div>

            <p className="password-hint">
              Use at least 8 characters. Combine uppercase and lowercase letters, a number, and a symbol.
              Example format: <strong>Mempco@2026</strong>
            </p>

            <div className="form-grid single">
              <div className="form-group">
                <label htmlFor="forced-password">New Password</label>
                <div className="password-field">
                  <input
                    id="forced-password"
                    type={showForcedPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Enter new password"
                    value={forcedPasswordForm.password}
                    onChange={(e) =>
                      setForcedPasswordForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    disabled={isBusy}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={showForcedPassword ? 'Hide permanent password' : 'Show permanent password'}
                    aria-pressed={showForcedPassword}
                    onClick={() => setShowForcedPassword((current) => !current)}
                    disabled={isBusy}
                  >
                    {showForcedPassword ? (
                      <EyeOff className="password-toggle-icon" aria-hidden="true" />
                    ) : (
                      <Eye className="password-toggle-icon" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="forced-confirm-password">Confirm Password</label>
                <div className="password-field">
                  <input
                    id="forced-confirm-password"
                    type={showForcedPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Confirm new password"
                    value={forcedPasswordForm.confirmPassword}
                    onChange={(e) =>
                      setForcedPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={showForcedPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                    aria-pressed={showForcedPassword}
                    onClick={() => setShowForcedPassword((current) => !current)}
                    disabled={isBusy}
                  >
                    {showForcedPassword ? (
                      <EyeOff className="password-toggle-icon" aria-hidden="true" />
                    ) : (
                      <Eye className="password-toggle-icon" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isBusy}>
              <AuthButtonIcon icon={CheckCircle2} />
              {isBusy ? 'Updating...' : 'Save Permanent Password'}
            </button>
          </form>
        </div>
      )}

      {isBusy && <AuthLoadingOverlay label={loadingLabel} />}
    </>
  );
}
