import React, { useState } from 'react';
import { api } from '../services/api';
import Button from '../components/ui/Button';
import './LoginPage.css';

export const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const authResult = await api.login(username.trim(), password.trim());
      if (onLoginSuccess) {
        onLoginSuccess(authResult);
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage(err.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestResult = api.loginAsGuest();
    if (onLoginSuccess) {
      onLoginSuccess(guestResult);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="10" fill="var(--purple-l)"/>
              <path d="M13 14H27M13 20H27M13 26H21" stroke="var(--purple)" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="login-title">Recall Studio</h1>
          <p className="login-subtitle">
            Sign in to sync flashcards, review schedules, and learning analytics
          </p>
        </div>

        {errorMessage && (
          <div className="login-error-banner" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6"/>
              <line x1="8" y1="5" x2="8" y2="9"/>
              <circle cx="8" cy="11.5" r="0.75" fill="currentColor"/>
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alex_student"
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>

        <div className="login-divider">
          <span>OR</span>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="guest-login-btn"
          onClick={handleGuestLogin}
          disabled={loading}
        >
          Explore Demo / Guest Mode
        </Button>

        <div className="login-footer-text">
          JWT Token Authentication via Django REST Framework & SimpleJWT
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
