import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api';
import './AuthForm.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-form">
          <p>This reset link is missing its token. Please use the link from your email.</p>
          <p className="auth-switch"><Link to="/forgot-password">Request a new link</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Set a new password</h2>
        {error && <p className="auth-error">{error}</p>}
        {done ? (
          <p>Password updated -- redirecting to login...</p>
        ) : (
          <>
            <label>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <button type="submit" className="btn btn-primary">Update password</button>
          </>
        )}
      </form>
    </div>
  );
}
