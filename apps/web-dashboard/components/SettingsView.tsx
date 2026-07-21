'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertCircle } from 'lucide-react';

interface SettingsData {
  cloud_api_key_masked: string | null;
  fallback_api_key_masked: string | null;
  cloud_model_name: string;
  cloud_coding_model_name: string | null;
  local_model_name: string;
}

export function SettingsView() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form inputs
  const [cloudApiKey, setCloudApiKey] = useState('');
  const [fallbackApiKey, setFallbackApiKey] = useState('');
  const [cloudModel, setCloudModel] = useState('');
  const [cloudCodingModel, setCloudCodingModel] = useState('');
  const [localModel, setLocalModel] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const json: SettingsData = await res.json();
      setData(json);
      setCloudModel(json.cloud_model_name);
      setCloudCodingModel(json.cloud_coding_model_name || '');
      setLocalModel(json.local_model_name);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: any = {
      cloud_model_name: cloudModel,
      cloud_coding_model_name: cloudCodingModel || null,
      local_model_name: localModel
    };
    if (cloudApiKey) payload.cloud_api_key = cloudApiKey;
    if (fallbackApiKey) payload.fallback_api_key = fallbackApiKey;

    try {
      const res = await fetch('http://localhost:8000/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      await fetchSettings();
      setCloudApiKey('');
      setFallbackApiKey('');
      setSuccess('Settings saved to .env! Please restart the backend for changes to take effect.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-jarvis-cyan">
        <RefreshCw className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-jarvis-cyan" size={24} />
        <h2 className="text-2xl font-bold tracking-widest uppercase text-jarvis-cyan">System Configuration</h2>
      </div>

      {error && (
        <div className="bg-jarvis-red/10 border border-jarvis-red text-jarvis-red p-4 rounded-lg mb-6 flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-jarvis-cyan/10 border border-jarvis-cyan text-jarvis-cyan p-4 rounded-lg mb-6 flex items-center gap-3">
          <Settings size={18} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-jarvis-border pb-2">API Keys</h3>
          <p className="text-sm text-jarvis-textMuted mb-4">
            Leave blank to keep existing keys. New keys will overwrite the values in your .env file.
          </p>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-jarvis-text">Primary Cloud API Key (Nvidia / OpenAI)</label>
            <div className="text-xs text-jarvis-textMuted mb-1">Current: {data?.cloud_api_key_masked || 'Not set'}</div>
            <input 
              type="password" 
              value={cloudApiKey}
              onChange={(e) => setCloudApiKey(e.target.value)}
              className="w-full bg-jarvis-bg border border-jarvis-border rounded p-2 text-white focus:border-jarvis-cyan focus:outline-none" 
              placeholder="sk-..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-jarvis-text">Fallback API Key</label>
            <div className="text-xs text-jarvis-textMuted mb-1">Current: {data?.fallback_api_key_masked || 'Not set'}</div>
            <input 
              type="password" 
              value={fallbackApiKey}
              onChange={(e) => setFallbackApiKey(e.target.value)}
              className="w-full bg-jarvis-bg border border-jarvis-border rounded p-2 text-white focus:border-jarvis-cyan focus:outline-none" 
              placeholder="sk-..."
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-jarvis-border pb-2">Models</h3>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-jarvis-text">General Cloud Model</label>
            <input 
              type="text" 
              value={cloudModel}
              onChange={(e) => setCloudModel(e.target.value)}
              className="w-full bg-jarvis-bg border border-jarvis-border rounded p-2 text-white focus:border-jarvis-cyan focus:outline-none" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-jarvis-text">Cloud Coding Model (Optional)</label>
            <input 
              type="text" 
              value={cloudCodingModel}
              onChange={(e) => setCloudCodingModel(e.target.value)}
              className="w-full bg-jarvis-bg border border-jarvis-border rounded p-2 text-white focus:border-jarvis-cyan focus:outline-none" 
              placeholder="e.g. meta/codellama-70b"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-jarvis-text">Local Model Name</label>
            <input 
              type="text" 
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              className="w-full bg-jarvis-bg border border-jarvis-border rounded p-2 text-white focus:border-jarvis-cyan focus:outline-none" 
            />
          </div>
        </section>

        <button 
          type="submit" 
          disabled={saving}
          className="flex items-center gap-2 bg-jarvis-cyan/20 text-jarvis-cyan border border-jarvis-cyan px-4 py-2 rounded hover:bg-jarvis-cyan hover:text-black transition-colors disabled:opacity-50"
        >
          {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          Save Configuration
        </button>
      </form>
    </div>
  );
}
