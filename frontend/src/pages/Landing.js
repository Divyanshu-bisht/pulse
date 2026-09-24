import React from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="hero-text">
          <h1>See what's happening, the moment it happens.</h1>
          <p>
            Connect any machine or app to one live dashboard -- no installs
            beyond a single lightweight script, no per-provider dashboards
            to check separately.
          </p>
          <div className="landing-cta">
            <Link to="/signup" className="btn btn-primary">Get started</Link>
            <Link to="/login" className="btn btn-secondary">Log in</Link>
          </div>
        </div>

        <div className="hero-waveform" aria-hidden="true">
          <svg viewBox="0 0 500 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 80 L90 80 L110 40 L130 130 L150 20 L170 80 L230 80 L250 55 L265 105 L280 80 L500 80"
              stroke="#4FD1C5"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="150" cy="20" r="4" fill="#4FD1C5" />
          </svg>
        </div>
      </section>

      <section className="landing-steps">
        <div className="step-card card">
          <span className="step-index">01</span>
          <h3>Connect a source</h3>
          <p>Run a one-time script on a server, or point any app at your unique ingest URL.</p>
        </div>
        <div className="step-card card">
          <span className="step-index">02</span>
          <h3>Set your rules</h3>
          <p>Decide what "something's wrong" looks like -- a threshold, a spike, a count.</p>
        </div>
        <div className="step-card card">
          <span className="step-index">03</span>
          <h3>Watch it live</h3>
          <p>Live graphs, a live event feed, and instant alerts when a rule fires.</p>
        </div>
      </section>
    </div>
  );
}
