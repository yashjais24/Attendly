import { supabase } from '../lib/supabase';

const API_BASE_URL = 'https://attendly-backend-gd2n.onrender.com';

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = new Headers(options.headers || {});
  
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.details 
      ? `${errorData.error}: ${errorData.details}`
      : errorData.error || `Error ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  // Some endpoints might return 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
};
