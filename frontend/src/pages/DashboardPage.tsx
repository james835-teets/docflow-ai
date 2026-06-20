import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, clearToken } from '../hooks/useApi';

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  documentType: string | null;
  createdAt: string;
  extractedData: { summary: string; confidence: number } | null;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function fetchDocuments() {
    try {
      const res = await api<{ data: Document[] }>('/documents');
      setDocuments(res.data);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchDocuments(); }, []);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api('/documents', { method: 'POST', body: formData });
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleLogout() {
    clearToken();
    navigate('/login');
  }

  const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex gap-6 items-center">
            <h1 className="text-xl font-bold">DocFlow AI</h1>
            <nav className="flex gap-4 text-sm">
              <a href="/" className="text-blue-600 font-medium">Documents</a>
              <a href="/api-keys" className="text-gray-600 hover:text-gray-900">API Keys</a>
            </nav>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-900">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
          <div className="flex gap-3 items-center">
            <input ref={fileInputRef} type="file" className="flex-1" accept=".pdf,.txt,.csv,.docx,.xlsx,.png,.jpg,.jpeg" />
            <button
              onClick={handleUpload} disabled={uploading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">File</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Summary</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : documents.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No documents yet</td></tr>
              ) : documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{doc.fileName}</td>
                  <td className="px-4 py-3">{doc.documentType ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[doc.status] ?? ''}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">
                    {doc.extractedData?.summary ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
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
