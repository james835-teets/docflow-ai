import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../hooks/useApi';

export function LoginPage() {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await api<{ data: { token: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ tenantId, email, password }),
      });
      setToken(res.data.token);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">DocFlow AI</h1>
        {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}
        <input
          type="text" placeholder="Tenant ID" value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3" required
        />
        <input
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3" required
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4" required
        />
        <button type="submit" className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700">
          Sign In
        </button>
      </form>
    </div>
  );
}
