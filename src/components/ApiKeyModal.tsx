import React, { useState } from 'react';
import { Key, ExternalLink, X, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSave: (key: string) => void;
  currentKey?: string | null;
  canClose?: boolean;
}

export default function ApiKeyModal({ isOpen, onClose, onSave, currentKey, canClose = false }: ApiKeyModalProps) {
  const [key, setKey] = useState(currentKey || '');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) {
      setError('Vui lòng nhập API Key');
      return;
    }
    if (trimmed.length < 20) {
      setError('API Key không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    setError('');
    onSave(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a8a] via-[#6d28d9] to-[#f97316] px-6 py-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Key size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg font-sans">Thiết lập API Key</h2>
              <p className="text-white/70 text-xs font-sans">Gemini AI — Google</p>
            </div>
          </div>
          {canClose && onClose && (
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {/* Hướng dẫn */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-bold text-blue-800 font-sans flex items-center gap-2">
              <AlertCircle size={16} />
              Hướng dẫn lấy API Key
            </p>
            <ol className="text-xs text-blue-700 space-y-1 font-sans list-decimal pl-4">
              <li>Truy cập trang Google AI Studio</li>
              <li>Đăng nhập bằng tài khoản Google (Gmail)</li>
              <li>Bấm <strong>"Create API Key"</strong> hoặc <strong>"Get API Key"</strong></li>
              <li>Sao chép key và dán vào ô bên dưới</li>
            </ol>
            <a 
              href="https://aistudio.google.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 mt-1 transition-colors font-sans"
            >
              <ExternalLink size={12} />
              Mở Google AI Studio để lấy key →
            </a>
          </div>

          {/* Input API Key */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 font-sans">API KEY</label>
            <div className="relative">
              <input 
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={e => { setKey(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#C1272D] focus:ring-2 focus:ring-[#C1272D]/10 transition-all font-mono"
                autoFocus
              />
              <button 
                onClick={() => setShowKey(!showKey)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-500 font-medium font-sans flex items-center gap-1">
                <AlertCircle size={12} />
                {error}
              </p>
            )}
          </div>

          {/* Lưu ý */}
          <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
            🔒 API Key được lưu trên trình duyệt của bạn (localStorage), không gửi đến bất kỳ server nào ngoài Google.
            Nếu hết quota, hãy dùng API Key từ tài khoản Gmail khác hoặc chờ đến ngày hôm sau.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button 
            onClick={handleSave}
            className="w-full py-3.5 bg-[#1e3a8a] text-white rounded-xl font-bold hover:bg-[#A11F24] transition-all text-sm font-sans shadow-lg shadow-[#C1272D]/20 active:scale-[0.98]"
          >
            Lưu API Key và Bắt đầu sử dụng
          </button>
        </div>
      </div>
    </div>
  );
}
