import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './AuthForm.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.post('/auth/forgot-password', { email });
    // We show the same message whether or not the email exists, on purpose --
    // this matches what the backend does, so we don't leak which emails are registered.
    setSent(true);
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Reset your password</h2>
        {sent ? (
          <p>If that email is registered, a reset link has been sent.</p>
        ) : (
          <>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button type="submit" className="btn btn-primary">Send reset link</button>
          </>
        )}
        <p className="auth-switch"><Link to="/login">Back to login</Link></p>
      </form>
    </div>
  );
}
