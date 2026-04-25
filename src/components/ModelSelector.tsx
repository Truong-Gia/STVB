import React from 'react';
import { Zap, Crown, Scale, Check } from 'lucide-react';
import { AVAILABLE_MODELS } from '../services/geminiService';

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

const MODEL_ICONS: Record<string, React.ReactNode> = {
  'gemini-3-flash-preview': <Zap size={20} className="text-amber-500" />,
  'gemini-3-pro-preview': <Crown size={20} className="text-purple-500" />,
  'gemini-2.5-flash': <Scale size={20} className="text-blue-500" />,
};

const MODEL_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  'gemini-3-flash-preview': { bg: 'bg-amber-50', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-700' },
  'gemini-3-pro-preview': { bg: 'bg-purple-50', border: 'border-purple-300', badge: 'bg-purple-100 text-purple-700' },
  'gemini-2.5-flash': { bg: 'bg-blue-50', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-700' },
};

export default function ModelSelector({ isOpen, onClose, selectedModel, onSelectModel }: ModelSelectorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 font-sans">Chọn Model AI</h2>
          <p className="text-xs text-gray-500 mt-1 font-sans">Chọn model phù hợp với nhu cầu sử dụng</p>
        </div>

        {/* Model Cards */}
        <div className="px-6 py-5 space-y-3">
          {AVAILABLE_MODELS.map(model => {
            const isSelected = selectedModel === model.id;
            const colors = MODEL_COLORS[model.id] || { bg: 'bg-gray-50', border: 'border-gray-300', badge: 'bg-gray-100 text-gray-700' };
            
            return (
              <button
                key={model.id}
                onClick={() => {
                  onSelectModel(model.id);
                  onClose();
                }}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md active:scale-[0.99] ${
                  isSelected 
                    ? `${colors.bg} ${colors.border} shadow-sm` 
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? colors.bg : 'bg-gray-100'}`}>
                      {MODEL_ICONS[model.id] || <Zap size={20} className="text-gray-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 font-sans">{model.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.badge}`}>
                          {model.badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 font-sans">{model.description}</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">{model.id}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-[#C1272D] rounded-full flex items-center justify-center shrink-0">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-6 pb-5">
          <p className="text-[11px] text-gray-400 font-sans">
            💡 Nếu model được chọn gặp lỗi, hệ thống sẽ tự động chuyển sang model dự phòng.
          </p>
        </div>
      </div>
    </div>
  );
}
