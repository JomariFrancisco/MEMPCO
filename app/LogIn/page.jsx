'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, LogIn } from 'lucide-react';
import Navbar from '@/components/Navbar/Navbar';
import {
  getCurrentPortalUser,
  isAdminRole,
  sendPasswordResetEmail,
  signInPortal,
  updatePortalPassword,
} from '@/lib/auth/portalAuth';
import './login.css';

const authLoadingCopy = {
  signin: 'Securing portal access...',
  forgot: 'Sending reset instructions...',
  reset: 'Updating secure password...',
};

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
  const router = useRouter();

  const [authMode, setAuthMode] = useState('signin');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState(authLoadingCopy.signin);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

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

    setIsSubmitting(true);
    setLoadingLabel(authLoadingCopy.signin);
    setMessage({ type: '', text: '' });

    try {
      const user = await signInPortal(loginForm);

      setMessage({
        type: 'success',
        text: 'Login successful. Redirecting...',
      });

      router.push(isAdminRole(user.role) ? '/admin-dashboard' : '/dashboard');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Unable to login. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setIsSubmitting(true);
    setLoadingLabel(authLoadingCopy.forgot);
    setMessage({ type: '', text: '' });

    try {
      await sendPasswordResetEmail(loginForm.email);
      setMessage({
        type: 'success',
        text: 'Password reset email sent. Open the link from your inbox to set a new password.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Unable to send password reset email.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

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

      setMessage({
        type: 'success',
        text: 'Password updated. Redirecting...',
      });

      router.push(isAdminRole(user?.role) ? '/admin-dashboard' : '/dashboard');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Unable to update password.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setMessage({ type: '', text: '' });
  };

  return (
    <>
      <Navbar />

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
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="login-password">Password</label>
                        <input
                          id="login-password"
                          type="password"
                          required
                          placeholder="Enter your password"
                          value={loginForm.password}
                          onChange={(e) => updateLogin('password', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="auth-form-row">
                      <label className="remember-me">
                        <input type="checkbox" />
                        <span>Remember me</span>
                      </label>

                      <button
                        type="button"
                        className="text-link"
                        onClick={handleForgotPassword}
                        disabled={isSubmitting}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                      <AuthButtonIcon icon={LogIn} />
                      Login to Portal
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
                        />
                      </div>
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                      <AuthButtonIcon icon={CheckCircle2} />
                      Update Password
                    </button>

                    <p className="auth-switch-text">
                      Return to{' '}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => switchMode('signin')}
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

      {isSubmitting && <AuthLoadingOverlay label={loadingLabel} />}
    </>
  );
}
