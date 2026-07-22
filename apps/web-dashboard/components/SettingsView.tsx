'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RefreshCw, AlertCircle, Shield, Brain, Volume2, Mic, Database, Cloud, ChevronDown } from 'lucide-react';

interface SettingsData {
  cloud_api_key_masked: string | null;
  fallback_api_key_masked: string | null;
  cloud_model_name: string;
  cloud_coding_model_name: string | null;
  local_model_name: string;
  wake_word_enabled: boolean;
  tts_provider: string;
  local_model_provider: string;
  cloud_model_provider: string;
  cloud_model_base_url: string | null;
}

export function SettingsView() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('api');

  // Form inputs
  const [cloudApiKey, setCloudApiKey] = useState('');
  const [fallbackApiKey, setFallbackApiKey] = useState('');
  const [cloudModel, setCloudModel] = useState('');
  const [cloudCodingModel, setCloudCodingModel] = useState('');
  const [localModel, setLocalModel] = useState('');
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [ttsProvider, setTtsProvider] = useState('system');
  const [localModelProvider, setLocalModelProvider] = useState('disabled');
  const [cloudModelProvider, setCloudModelProvider] = useState('disabled');
  const [cloudModelBaseUrl, setCloudModelBaseUrl] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const json: SettingsData = await res.json();
      setData(json);
      setCloudModel(json.cloud_model_name);
      setCloudCodingModel(json.cloud_coding_model_name || '');
      setLocalModel(json.local_model_name);
      setWakeWordEnabled(json.wake_word_enabled);
      setTtsProvider(json.tts_provider);
      setLocalModelProvider(json.local_model_provider);
      setCloudModelProvider(json.cloud_model_provider);
      setCloudModelBaseUrl(json.cloud_model_base_url || '');
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
      local_model_name: localModel,
      wake_word_enabled: wakeWordEnabled,
      tts_provider: ttsProvider,
      local_model_provider: localModelProvider,
      cloud_model_provider: cloudModelProvider,
      cloud_model_base_url: cloudModelBaseUrl || null,
    };
    if (cloudApiKey) payload.cloud_api_key = cloudApiKey;
    if (fallbackApiKey) payload.fallback_api_key = fallbackApiKey;

    try {
      const res = await fetch('http://localhost:8000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      await fetchSettings();
      setCloudApiKey('');
      setFallbackApiKey('');
      setSuccess('Configuration saved! Restart the backend for changes to take effect.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <RefreshCw className="text-jarvis-cyan" size={24} />
        </motion.div>
      </div>
    );
  }

  const sections = [
    { id: 'api', icon: Shield, label: 'API Keys' },
    { id: 'models', icon: Brain, label: 'Models' },
    { id: 'voice', icon: Volume2, label: 'Voice Engine' },
    { id: 'system', icon: Database, label: 'System' },
  ];

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-jarvis-cyan/50 focus:outline-none focus:ring-1 focus:ring-jarvis-cyan/20 transition-all text-sm placeholder-jarvis-textMuted/40";
  const selectCls = "w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-jarvis-cyan/50 focus:outline-none transition-all text-sm appearance-none cursor-pointer";
  const labelCls = "text-sm font-medium text-jarvis-text tracking-wide";
  const hintCls = "text-xs text-jarvis-textMuted mt-1";

  return (
    <div className="h-full flex p-6 overflow-hidden">
      {/* Section Navigation */}
      <div className="w-56 pr-6 border-r border-white/10 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center gap-2.5 mb-6">
          <Settings className="text-jarvis-cyan" size={22} />
          <h2 className="text-xl font-bold tracking-widest uppercase text-jarvis-cyan text-glow-subtle">Config</h2>
        </div>
        {sections.map(({ id, icon: Icon, label }) => (
          <motion.button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all w-full text-left ${
              activeSection === id
                ? 'bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/30'
                : 'text-jarvis-textMuted hover:text-white hover:bg-white/5 border border-transparent'
            }`}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon size={16} />{label}
          </motion.button>
        ))}
      </div>

      {/* Settings Form */}
      <div className="flex-1 pl-8 overflow-y-auto custom-scrollbar">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-jarvis-red/10 border border-jarvis-red/40 text-jarvis-red p-4 rounded-xl mb-6 flex items-center gap-3 text-sm"
          >
            <AlertCircle size={16} /><span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-jarvis-cyan/10 border border-jarvis-cyan/30 text-jarvis-cyan p-4 rounded-xl mb-6 flex items-center gap-3 text-sm"
          >
            <Shield size={16} /><span>{success}</span>
          </motion.div>
        )}

        <form onSubmit={handleSave} className="space-y-8 max-w-xl">
          {/* API Keys Section */}
          {activeSection === 'api' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">API Keys</h3>
                <p className="text-sm text-jarvis-textMuted">Leave blank to keep existing keys. New keys overwrite your .env file.</p>
              </div>
              
              <div className="space-y-2">
                <label className={labelCls}>Primary Cloud API Key</label>
                <div className="text-xs text-jarvis-cyan/60 mb-1">Current: {data?.cloud_api_key_masked || 'Not configured'}</div>
                <input type="password" value={cloudApiKey} onChange={(e) => setCloudApiKey(e.target.value)} className={inputCls} placeholder="nvapi-... or sk-..." />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Fallback API Key</label>
                <div className="text-xs text-jarvis-cyan/60 mb-1">Current: {data?.fallback_api_key_masked || 'Not configured'}</div>
                <input type="password" value={fallbackApiKey} onChange={(e) => setFallbackApiKey(e.target.value)} className={inputCls} placeholder="sk-..." />
              </div>
            </motion.div>
          )}

          {/* Models Section */}
          {activeSection === 'models' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Model Configuration</h3>
                <p className="text-sm text-jarvis-textMuted">Configure cloud and local model providers.</p>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Cloud Model Provider</label>
                <div className="relative">
                  <select value={cloudModelProvider} onChange={(e) => setCloudModelProvider(e.target.value)} className={selectCls}>
                    <option value="disabled">Disabled</option>
                    <option value="openai">OpenAI</option>
                    <option value="openai_compatible">OpenAI Compatible (NVIDIA, etc.)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-jarvis-textMuted pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Cloud Model Base URL</label>
                <input type="text" value={cloudModelBaseUrl} onChange={(e) => setCloudModelBaseUrl(e.target.value)} className={inputCls} placeholder="https://integrate.api.nvidia.com/v1" />
                <p className={hintCls}>Leave empty for default OpenAI endpoint.</p>
              </div>
              
              <div className="space-y-2">
                <label className={labelCls}>General Cloud Model</label>
                <input type="text" value={cloudModel} onChange={(e) => setCloudModel(e.target.value)} className={inputCls} placeholder="meta/llama-3.1-70b-instruct" />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Cloud Coding Model (Optional)</label>
                <input type="text" value={cloudCodingModel} onChange={(e) => setCloudCodingModel(e.target.value)} className={inputCls} placeholder="meta/codellama-70b" />
                <p className={hintCls}>Specialized model for code generation tasks.</p>
              </div>

              <div className="border-t border-white/10 pt-6 space-y-4">
                <div className="space-y-2">
                  <label className={labelCls}>Local Model Provider</label>
                  <div className="relative">
                    <select value={localModelProvider} onChange={(e) => setLocalModelProvider(e.target.value)} className={selectCls}>
                      <option value="disabled">Disabled</option>
                      <option value="ollama">Ollama</option>
                      <option value="openai_compatible">OpenAI Compatible</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-jarvis-textMuted pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Local Model Name</label>
                  <input type="text" value={localModel} onChange={(e) => setLocalModel(e.target.value)} className={inputCls} placeholder="llama3.2" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Voice Engine Section */}
          {activeSection === 'voice' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Voice Engine</h3>
                <p className="text-sm text-jarvis-textMuted">Configure wake word, speech-to-text, and text-to-speech.</p>
              </div>

              <div className="space-y-3">
                <label className={labelCls}>Wake Word Detection</label>
                <div className="flex items-center gap-4">
                  <motion.button
                    type="button"
                    onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${wakeWordEnabled ? 'bg-jarvis-cyan' : 'bg-white/10'}`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="absolute w-5 h-5 rounded-full bg-white shadow-md top-1"
                      animate={{ left: wakeWordEnabled ? 26 : 4 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                  <span className="text-sm text-jarvis-textMuted">{wakeWordEnabled ? 'Enabled — "Hey Jarvis"' : 'Disabled'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Text-to-Speech Provider</label>
                <div className="relative">
                  <select value={ttsProvider} onChange={(e) => setTtsProvider(e.target.value)} className={selectCls}>
                    <option value="system">System Voice (macOS / Windows)</option>
                    <option value="piper">Piper (Local Neural TTS)</option>
                    <option value="kokoro">Kokoro (High Quality)</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-jarvis-textMuted pointer-events-none" />
                </div>
                <p className={hintCls}>System voice uses your OS built-in voices. Piper and Kokoro run locally for higher quality.</p>
              </div>
            </motion.div>
          )}

          {/* System Section */}
          {activeSection === 'system' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">System Info</h3>
                <p className="text-sm text-jarvis-textMuted">Read-only system configuration details.</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Cloud Provider', value: data?.cloud_model_provider || '—' },
                  { label: 'Cloud Model', value: data?.cloud_model_name || '—' },
                  { label: 'Local Provider', value: data?.local_model_provider || '—' },
                  { label: 'Local Model', value: data?.local_model_name || '—' },
                  { label: 'TTS', value: data?.tts_provider || '—' },
                  { label: 'Wake Word', value: data?.wake_word_enabled ? 'Enabled' : 'Disabled' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-white/5">
                    <span className="text-sm text-jarvis-textMuted">{label}</span>
                    <span className="text-sm text-white font-medium capitalize">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Save Button — shown on editable sections */}
          {activeSection !== 'system' && (
            <motion.button 
              type="submit" 
              disabled={saving}
              className="flex items-center gap-2.5 bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/40 px-5 py-2.5 rounded-xl hover:bg-jarvis-cyan hover:text-black transition-all disabled:opacity-50 text-sm font-medium tracking-wide"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              Save Configuration
            </motion.button>
          )}
        </form>
      </div>
    </div>
  );
}
