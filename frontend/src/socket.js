import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

// Creates (or reuses) a single socket connection authenticated with the JWT.
export function getSocket() {
  const token = localStorage.getItem('pulse_token');
  if (!token) return null;

  if (!socket) {
    socket = io(SOCKET_URL, { auth: { token } });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
