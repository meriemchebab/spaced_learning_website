import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import LoginPage from './LoginPage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    login: vi.fn(),
    loginAsGuest: vi.fn(() => ({ username: 'Guest User', isGuest: true }))
  }
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form elements cleanly', () => {
    render(<LoginPage onLoginSuccess={() => {}} />);
    expect(screen.getByRole('heading', { name: /recall studio/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('submits credentials to api.login and calls onLoginSuccess on success', async () => {
    const onLoginSuccess = vi.fn();
    api.login.mockResolvedValueOnce({ token: 'mock-jwt-token', refreshToken: 'mock-refresh-token', username: 'alex' });

    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alex' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('alex', 'password123');
      expect(onLoginSuccess).toHaveBeenCalledWith({
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        username: 'alex'
      });
    });
  });

  it('displays error banner when api.login rejects with invalid credentials', async () => {
    api.login.mockRejectedValueOnce(new Error('Invalid username or password'));

    render(<LoginPage onLoginSuccess={() => {}} />);

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'wrong_user' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong_pass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid username or password/i);
    });
  });

  it('supports guest mode login', () => {
    const onLoginSuccess = vi.fn();
    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /explore demo \/ guest mode/i }));

    expect(api.loginAsGuest).toHaveBeenCalled();
    expect(onLoginSuccess).toHaveBeenCalledWith({ username: 'Guest User', isGuest: true });
  });
});
