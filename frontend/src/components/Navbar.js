import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { disconnectSocket } from '../socket';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = !!localStorage.getItem('pulse_token');

  function handleLogout() {
    localStorage.removeItem('pulse_token');
    disconnectSocket();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Pulse</Link>
      <div className="navbar-links">
        {loggedIn ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/rules">Rules</Link>
            <Link to="/alerts">Alerts</Link>
            <Link to="/settings">Settings</Link>
            <button className="navbar-logout" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
