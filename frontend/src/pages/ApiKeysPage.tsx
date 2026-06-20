import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, clearToken } from '../hooks/useApi';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  isRevoked: boolean;
  createdAt: string;
}

export function ApiKeysPage() {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [error, setError] = useState('');

  async function fetchKeys() {
    try {
      const res = await api<{ data: ApiKey[] }>('/auth/api-keys');
      setKeys(res.data);
    } catch {
      setError('Failed to load API keys');
    }
  }

  useEffect(() => { void fetchKeys(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNewKey('');
    try {
      const res = await api<{ data: { plainTextKey: string } }>('/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setNewKey(res.data.plainTextKey);
      setName('');
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    }
  }

  async function handleRevoke(id: string) {
    try {
      await api(`/auth/api-keys/${id}`, { method: 'DELETE' });
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke key');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex gap-6 items-center">
            <h1 className="text-xl font-bold">DocFlow AI</h1>
            <nav className="flex gap-4 text-sm">
              <a href="/" className="text-gray-600 hover:text-gray-900">Documents</a>
              <a href="/api-keys" className="text-blue-600 font-medium">API Keys</a>
            </nav>
          </div>
          <button onClick={() => { clearToken(); navigate('/login'); }} className="text-sm text-gray-600 hover:text-gray-900">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create API Key</h2>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              type="text" placeholder="Key name (e.g. CI Pipeline)" value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 border rounded px-3 py-2" required
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Create
            </button>
          </form>
          {newKey && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-medium text-green-800">Key created! Copy it now — it won't be shown again:</p>
              <code className="block mt-1 p-2 bg-white rounded text-sm font-mono break-all">{newKey}</code>
            </div>
          )}
        </div>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Prefix</th>
                <th className="px-4 py-3 text-left font-medium">Permissions</th>
                <th className="px-4 py-3 text-left font-medium">Last Used</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {keys.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No API keys</td></tr>
              ) : keys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-500">{key.keyPrefix}...</td>
                  <td className="px-4 py-3">{key.permissions.join(', ')}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${key.isRevoked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {key.isRevoked ? 'Revoked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!key.isRevoked && (
                      <button onClick={() => handleRevoke(key.id)} className="text-red-600 hover:text-red-800 text-sm">
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
