import { API_BASE } from '../config';

let _logoutCallback = null;
let _isLoggingOut = false;

export const registerLogoutCallback = (fn) => {
  _logoutCallback = fn;
};

export const fetchWithAuth = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401 && !_isLoggingOut) {
    _isLoggingOut = true;
    if (_logoutCallback) {
      await _logoutCallback();
    } else {
      window.location.href = '/login';
    }
    _isLoggingOut = false;
  }

  return response;
};