export const API_URL = process.env.API_URL || 'http://localhost:3000';

export function apiFetch(path, options = {}) {
  return fetch(`${API_URL}${path}`, options);
}