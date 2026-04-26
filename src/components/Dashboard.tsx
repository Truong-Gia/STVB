import React from 'react';
import { Search, Copy, Plus, ArrowDown, Sparkles, FileText, Trash2, Eye } from 'lucide-react';
import { AdministrativeDocumentData } from '../types';

interface DashboardProps {
  documents: AdministrativeDocumentData[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateNew: () => void;
  onView: (doc: AdministrativeDocumentData) => void;
  onCopy: (doc: AdministrativeDocumentData) => void;
  onDelete: (id: string) => void;
}

export default function Dashboard({
  documents,
  searchQuery,
  onSearchChange,
  onCreateNew,
  onView,
  onCopy,
  onDelete,
}: DashboardProps) {
  const filteredDocuments = documents.filter(doc =>
    (doc.subject || doc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col items-center py-10 px-4 font-sans relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #E3F2FD 0%, #F5F5F5 100%)' }}>
      {/* Decorative background circles */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200/15 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-100/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-100/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />

      {/* Hero section */}
      <div className="relative z-10 flex flex-col items-center mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={30} className="text-blue-600 animate-pulse" />
          <span className="text-gray-800 text-lg font-bold font-medium tracking-wide">Việc gì khó - Đã có AI lo</span>
          <Sparkles size={20} className="text-blue-600 animate-pulse" />
        </div>

        {/* Bouncing arrow pointing to button */}
        <div className="flex flex-col items-center mb-2 animate-bounce">
          <span className="text-blue-600 text-xs font-bold tracking-wider mb-1">BẤM VÀO ĐÂY</span>
          <ArrowDown size={24} className="text-blue-600" />
        </div>

        {/* TẠO MỚI VĂN BẢN button */}
        <button
          onClick={onCreateNew}
          className="group relative px-10 py-4 rounded-2xl text-white font-bold text-xl uppercase tracking-wider shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-95"
          style={{ background: 'linear-gradient(135deg, #1F5BA8 0%, #0D47A1 50%, #26A65B 100%)' }}
        >
          <span className="absolute inset-0 rounded-2xl border-2 border-white/30 group-hover:border-white/60 transition-colors" />
          <span className="flex items-center gap-3">
            <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            BẮT ĐẦU TẠO MỚI VĂN BẢN
            <FileText size={22} />
          </span>
        </button>

        <p className="text-white/60 text-xs mt-3 tracking-wide">Tạo văn bản chuẩn hành chính và văn bản Đảng trong vài phút</p>
      </div>

      {/* Documents panel */}
      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20 relative z-10">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1F5BA8' }}>
          <FileText size={20} />
          Văn bản của bạn
        </h2>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm văn bản..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          />
        </div>

        {/* Desktop table */}
        <div className="bg-white rounded-xl border border-blue-100 overflow-hidden hidden md:block shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-blue-100 text-xs uppercase font-bold" style={{ background: 'linear-gradient(135deg, #1F5BA815, #0D47A115)' }}>
              <tr className="text-blue-600">
                <th className="px-6 py-4 w-16">STT</th>
                <th className="px-6 py-4">TÊN VĂN BẢN</th>
                <th className="px-6 py-4 w-40">LOẠI VĂN BẢN</th>
                <th className="px-6 py-4 w-32">NGÀY TẠO</th>
                <th className="px-6 py-4 w-64">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {filteredDocuments.map((doc, index) => (
                <tr key={doc.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #1F5BA8, #0D47A1)' }}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800 truncate max-w-md" title={doc.subject || doc.name || 'Văn bản không tên'}>
                    {doc.subject || doc.name || 'Văn bản không tên'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-blue-700 bg-blue-100">{doc.type}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {new Date(doc.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onView(doc)} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg, #1F5BA8, #0D47A1)' }}>
                        <Eye size={12} /> Xem
                      </button>
                      <button onClick={() => onCopy(doc)} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg, #26A65B, #229954)' }}>
                        <Copy size={12} /> Sao chép
                      </button>
                      <button onClick={() => onDelete(doc.id!)} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg, #F39C12, #E67E22)' }}>
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocuments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <FileText size={40} className="mx-auto mb-3 text-blue-200" />
                    <p className="text-sm">Chưa có văn bản nào. Hãy bắt đầu tạo văn bản!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {filteredDocuments.map((doc, index) => (
            <div key={doc.id} className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{doc.subject || doc.name || 'Văn bản không tên'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-700 bg-blue-100">{doc.type}</span>
                    <span className="text-xs text-gray-400">{new Date(doc.createdAt || Date.now()).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #1F5BA8, #0D47A1)' }}>
                  {index + 1}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onView(doc)} className="flex-1 py-2 text-xs font-medium text-white rounded-lg flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg, #1F5BA8, #0D47A1)' }}>
                  <Eye size={12} /> Xem
                </button>
                <button onClick={() => onCopy(doc)} className="flex-1 py-2 text-xs font-medium text-white rounded-lg flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg, #26A65B, #229954)' }}>
                  <Copy size={12} /> Sao chép
                </button>
                <button onClick={() => onDelete(doc.id!)} className="flex-1 py-2 text-xs font-medium text-white rounded-lg flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg, #F39C12, #E67E22)' }}>
                  <Trash2 size={12} /> Xóa
                </button>
              </div>
            </div>
          ))}
          {filteredDocuments.length === 0 && (
            <div className="py-12 text-center">
              <FileText size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm">Chưa có văn bản nào.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-600 tracking-wide font-medium relative z-10">
        Hoàn thiện: <span className="text-blue-600 font-bold">Lâm Trương - V1.0/2604</span>
      </div>
    </div>
  );
}
