const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user_info');
  window.location.href = '/';
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'x-auth-token': token } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    logout();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  return response;
}
