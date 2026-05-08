'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar/Navbar';
import {
  findUserForLogin,
  registerEmployee,
  seedDemoData,
  setCurrentUser,
} from '../portalStorage';
import './login.css';

const emptySignup = {
  name: '',
  employeeId: '',
  department: '',
  branch: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export default function LoginPage() {
  const router = useRouter();

  const [authMode, setAuthMode] = useState('signin');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState(emptySignup);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    seedDemoData();
  }, []);

  const updateLogin = (field, value) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateSignup = (field, value) => {
    setSignupForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    seedDemoData();

    const employeeUser = findUserForLogin({
      email: loginForm.email,
      password: loginForm.password,
      role: 'employee',
    });

    const adminUser = findUserForLogin({
      email: loginForm.email,
      password: loginForm.password,
      role: 'admin',
    });

    const user = employeeUser || adminUser;

    if (!user) {
      setMessage({
        type: 'error',
        text: 'Invalid email or password. Please check your login details.',
      });
      return;
    }

    setCurrentUser(user);

    setMessage({
      type: 'success',
      text: 'Login successful. Redirecting...',
    });

    router.push(user.role === 'admin' ? '/admin-dashboard' : '/dashboard');
  };

  const handleSignup = (e) => {
    e.preventDefault();
    seedDemoData();

    if (signupForm.password !== signupForm.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Password and confirm password do not match.',
      });
      return;
    }

    try {
      const employee = registerEmployee(signupForm);

      setCurrentUser(employee);
      setSignupForm(emptySignup);

      setMessage({
        type: 'success',
        text: 'Account created successfully. Redirecting...',
      });

      router.push('/dashboard');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Unable to create account.',
      });
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
          <div className={`auth-shell ${authMode === 'signup' ? 'signup-mode' : ''}`}>
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
                <div className="auth-toggle">
                  <span className="auth-toggle-indicator" />

                  <button
                    type="button"
                    className={authMode === 'signin' ? 'active' : ''}
                    onClick={() => switchMode('signin')}
                  >
                    Sign In
                  </button>

                  <button
                    type="button"
                    className={authMode === 'signup' ? 'active' : ''}
                    onClick={() => switchMode('signup')}
                  >
                    Create Account
                  </button>
                </div>

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
                      <p>
                        Login using your saved employee or admin account.
                      </p>
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
                        onClick={() =>
                          setMessage({
                            type: 'success',
                            text: 'Demo only: password reset is not connected to a backend yet.',
                          })
                        }
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button type="submit" className="auth-submit-btn">
                      Login to Portal
                    </button>

                    <p className="auth-switch-text">
                      No account yet?{' '}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => switchMode('signup')}
                      >
                        Create one
                      </button>
                    </p>
                  </form>

                  <form
                    onSubmit={handleSignup}
                    className={`auth-form signup-form ${authMode === 'signup' ? 'active' : ''}`}
                  >
                    <div className="auth-form-head">
                      <span className="auth-kicker">Employee Registration</span>
                      <h2>Create employee account</h2>
                      <p>
                        Register an employee demo account that can submit helpdesk tickets.
                      </p>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="signup-name">Full Name</label>
                        <input
                          id="signup-name"
                          type="text"
                          required
                          placeholder="Enter full name"
                          value={signupForm.name}
                          onChange={(e) => updateSignup('name', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="signup-employee-id">Employee ID</label>
                        <input
                          id="signup-employee-id"
                          type="text"
                          required
                          placeholder="Enter employee ID"
                          value={signupForm.employeeId}
                          onChange={(e) => updateSignup('employeeId', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="signup-department">Department</label>
                        <input
                          id="signup-department"
                          type="text"
                          required
                          placeholder="Enter department"
                          value={signupForm.department}
                          onChange={(e) => updateSignup('department', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="signup-branch">Branch / Office</label>
                        <input
                          id="signup-branch"
                          type="text"
                          required
                          placeholder="Enter assigned office"
                          value={signupForm.branch}
                          onChange={(e) => updateSignup('branch', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="signup-email">Email Address</label>
                        <input
                          id="signup-email"
                          type="email"
                          required
                          placeholder="Enter employee email"
                          value={signupForm.email}
                          onChange={(e) => updateSignup('email', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="signup-phone">Phone Number</label>
                        <input
                          id="signup-phone"
                          type="text"
                          required
                          placeholder="Enter phone number"
                          value={signupForm.phone}
                          onChange={(e) => updateSignup('phone', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="signup-password">Password</label>
                        <input
                          id="signup-password"
                          type="password"
                          required
                          placeholder="Create password"
                          value={signupForm.password}
                          onChange={(e) => updateSignup('password', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="signup-confirm-password">Confirm Password</label>
                        <input
                          id="signup-confirm-password"
                          type="password"
                          required
                          placeholder="Confirm password"
                          value={signupForm.confirmPassword}
                          onChange={(e) => updateSignup('confirmPassword', e.target.value)}
                        />
                      </div>
                    </div>

                    <label className="remember-me auth-terms">
                      <input type="checkbox" required />
                      <span>I confirm that the information provided is correct.</span>
                    </label>

                    <button type="submit" className="auth-submit-btn">
                      Create Account
                    </button>

                    <p className="auth-switch-text">
                      Already registered?{' '}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => switchMode('signin')}
                      >
                        Sign in
                      </button>
                    </p>
                  </form>
                </div>

                <p className="auth-bottom-note">
                  Demo only — data is stored temporarily in this browser
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}