/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Send,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Download,
  Printer,
  ChevronRight,
  Plus,
  X,
  ChevronLeft,
  Settings,
  Sparkles,
  Edit3,
  Upload,
  FileUp,
  Eye,
  Search,
  Monitor
} from 'lucide-react';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { generateDocumentContent, exportToWord, getApiKey, setApiKey as saveApiKey, getSelectedModel, setSelectedModel as saveSelectedModel } from './services/geminiService';
import { AdministrativeDocumentData, INITIAL_DOCUMENT_DATA, DocumentType, Signer, ReferenceFile } from './types';
import Dashboard from './components/Dashboard';
import PreviewPanel from './components/PreviewPanel';
import ApiKeyModal from './components/ApiKeyModal';
import ModelSelector from './components/ModelSelector';
import AutocompleteInput from './components/AutocompleteInput';
import { useFieldHistory, FIELD_KEYS } from './hooks/useFieldHistory';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [documents, setDocuments] = useState<AdministrativeDocumentData[]>(() => {
    const saved = localStorage.getItem('admin_documents');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [step, setStep] = useState(1);
  const [data, setData] = useState<AdministrativeDocumentData>(() => {
    const saved = localStorage.getItem('admin_doc_draft');
    return saved ? JSON.parse(saved) : { ...INITIAL_DOCUMENT_DATA, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  });
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [showAddSigner, setShowAddSigner] = useState(false);
  const [newSigner, setNewSigner] = useState<Signer>({ id: '', position: '', fullName: '' });
  const [parsingFile, setParsingFile] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  // API Key & Model Management
  const [apiKey, setApiKeyState] = useState<string | null>(() => getApiKey());
  const [showApiKeyModal, setShowApiKeyModal] = useState(() => !getApiKey());
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectedModel, setSelectedModelState] = useState(() => getSelectedModel());

  // Field History for autocomplete
  const fieldHistory = useFieldHistory();
  const historyFor = (key: string) => fieldHistory.getHistory(key);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('admin_doc_draft', JSON.stringify(data));

    // Show "Đã lưu nháp" indicator
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setShowSaved(true);
    saveTimerRef.current = window.setTimeout(() => setShowSaved(false), 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [data]);

  useEffect(() => {
    localStorage.setItem('admin_documents', JSON.stringify(documents));
  }, [documents]);

  const handleReset = () => {
    setData({ ...INITIAL_DOCUMENT_DATA, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setStep(1);
    setAiPrompt('');
    localStorage.removeItem('admin_doc_draft');
  };

  const handleCreateNew = () => {
    setData({ ...INITIAL_DOCUMENT_DATA, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setStep(1);
    setAiPrompt('');
    setView('editor');
  };

  const handleView = (doc: AdministrativeDocumentData) => {
    setData(doc);
    setStep(1);
    setAiPrompt('');
    setView('editor');
  };

  const handleCopy = (doc: AdministrativeDocumentData) => {
    const newDoc = {
      ...doc,
      id: Date.now().toString(),
      name: doc.name ? `${doc.name} (Bản sao)` : 'Bản sao',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDocuments(prev => [newDoc, ...prev]);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa văn bản này?')) return;
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (data.id === id) {
      handleReset();
      setView('dashboard');
    }
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSaveApiKey = (key: string) => {
    saveApiKey(key);
    setApiKeyState(key);
    setShowApiKeyModal(false);
  };

  const handleSelectModel = (modelId: string) => {
    saveSelectedModel(modelId);
    setSelectedModelState(modelId);
  };

  const getErrorMessage = (err: any): string => {
    const msg = err?.message || '';
    if (msg === 'API_KEY_MISSING') {
      setShowApiKeyModal(true);
      return 'Chưa nhập API Key. Vui lòng nhập API Key để sử dụng.';
    }
    if (msg === 'API_KEY_INVALID') {
      setShowApiKeyModal(true);
      return 'API Key không hợp lệ. Vui lòng kiểm tra lại hoặc tạo key mới.';
    }
    if (msg === 'QUOTA_EXHAUSTED') {
      return '⚠️ Đã hết quota API! Bạn có thể: (1) Lấy API Key từ Gmail khác, hoặc (2) Chờ đến ngày hôm sau để dùng tiếp. Bấm nút Settings trên Header để thay đổi API Key.';
    }
    return 'Đã có lỗi xảy ra khi tạo nội dung. Vui lòng thử lại.';
  };

  const handlePreview = async () => {
    if (!aiPrompt.trim()) return;
    if (!apiKey) { setShowApiKeyModal(true); return; }
    setLoading(true);
    setError(null);
    try {
      const content = await generateDocumentContent(data, aiPrompt, apiKey, selectedModel);
      setData(prev => ({ ...prev, content }));
    } catch (err: any) {
      console.error(err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    if (!apiKey) { setShowApiKeyModal(true); return; }
    setLoading(true);
    setError(null);
    try {
      const content = await generateDocumentContent(data, aiPrompt, apiKey, selectedModel);
      setData(prev => ({ ...prev, content }));
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Lưu lịch sử tất cả fields đã nhập
  const saveFieldsToHistory = () => {
    fieldHistory.addToHistory(FIELD_KEYS.PARENT_AGENCY, data.parentAgency);
    fieldHistory.addToHistory(FIELD_KEYS.ISSUING_AGENCY, data.issuingAgency);
    fieldHistory.addToHistory(FIELD_KEYS.ISSUING_AGENCY_ABBR, data.issuingAgencyAbbr);
    fieldHistory.addToHistory(FIELD_KEYS.UNIT_CODE, data.unitCode);
    fieldHistory.addToHistory(FIELD_KEYS.LOCATION, data.location);
    fieldHistory.addToHistory(FIELD_KEYS.SIGNER_POSITION, data.mainSigner.position);
    fieldHistory.addToHistory(FIELD_KEYS.SIGNER_NAME, data.mainSigner.fullName);
    if (data.subject) fieldHistory.addToHistory(FIELD_KEYS.SUBJECT, data.subject);
    data.recipients.forEach(r => fieldHistory.addToHistory(FIELD_KEYS.RECIPIENT, r));
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await exportToWord(data);

      // Lưu lịch sử fields khi tải thành công
      saveFieldsToHistory();

      // Save to documents list after successful download
      if (data.id) {
        setDocuments(prev => {
          const index = prev.findIndex(d => d.id === data.id);
          const updatedDoc = { ...data, updatedAt: new Date().toISOString() };
          if (index >= 0) {
            const newDocs = [...prev];
            newDocs[index] = updatedDoc;
            return newDocs;
          } else {
            return [updatedDoc, ...prev];
          }
        });
      }
    } catch (err) {
      console.error(err);
      alert('Không thể xuất file Word.');
    } finally {
      setDownloading(false);
    }
  };

  const addRecipient = () => {
    if (newRecipient.trim() && !data.recipients.includes(newRecipient.trim())) {
      setData(prev => ({ ...prev, recipients: [...prev.recipients, newRecipient.trim()] }));
      setNewRecipient('');
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });

  const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac', 'wma'];
  const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setParsingFile(true);
    setError(null);

    const newReferenceFiles: ReferenceFile[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        let text = '';
        const fileType = file.name.split('.').pop()?.toLowerCase() || '';

        // --- Audio files → cho phép upload với ghi chú ---
        if (AUDIO_EXTS.includes(fileType)) {
          const audioNote = prompt(
            `Bạn đang upload file âm thanh: ${file.name}\n\nVui lòng cung cấp mô tả hoặc nội dung chính của file này (để AI sử dụng làm tài liệu tham khảo):\n\n(Để trống để bỏ qua file này)`,
            ''
          );

          if (!audioNote || !audioNote.trim()) {
            errors.push(`${file.name}: Bị bỏ qua vì không có nội dung mô tả`);
            continue;
          }

          newReferenceFiles.push({ name: file.name, content: audioNote.trim() });
          continue;
        }

        // --- Image files → gửi base64 cho AI ---
        if (IMAGE_EXTS.includes(fileType)) {
          const base64 = await readFileAsBase64(file);
          const base64Data = base64.split(',')[1];
          const mimeType = file.type || `image/${fileType === 'jpg' ? 'jpeg' : fileType}`;
          newReferenceFiles.push({ name: file.name, content: '[File hình ảnh]', mimeType, data: base64Data });
          continue;
        }

        // --- Word (.docx) ---
        if (fileType === 'docx') {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
        }
        // --- PDF ---
        else if (fileType === 'pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item: any) => item.str);
            fullText += strings.join(' ') + '\n';
          }
          text = fullText;
        }
        // --- Excel (.xlsx, .xls, .csv) ---
        else if (fileType === 'xlsx' || fileType === 'xls' || fileType === 'csv') {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          let fullText = '';
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            fullText += `Sheet: ${sheetName}\n` + XLSX.utils.sheet_to_txt(worksheet) + '\n';
          });
          text = fullText;
        }
        // --- Plain text (.txt, .md, .json, .xml, .html, .rtf) ---
        else if (['txt', 'md', 'json', 'xml', 'html', 'htm', 'rtf', 'log'].includes(fileType)) {
          text = await readFileAsText(file);
        }
        // --- Các định dạng khác → đọc thử như text ---
        else {
          try {
            text = await readFileAsText(file);
            if (!text.trim() || text.includes('\uFFFD')) {
              throw new Error('binary');
            }
          } catch {
            errors.push(`${file.name}: định dạng .${fileType} chưa hỗ trợ`);
            continue;
          }
        }

        if (!text.trim()) {
          errors.push(`${file.name}: không tìm thấy nội dung`);
          continue;
        }

        newReferenceFiles.push({ name: file.name, content: text });
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message || 'Lỗi đọc file'}`);
      }
    }

    // Thêm tất cả file đọc thành công
    if (newReferenceFiles.length > 0) {
      setData(prev => ({
        ...prev,
        referenceFiles: [...(prev.referenceFiles || []), ...newReferenceFiles]
      }));
    }

    // Báo lỗi cho các file thất bại (nhưng không chặn file thành công)
    if (errors.length > 0) {
      setError(`Một số file không đọc được:\n${errors.join('\n')}`);
    }

    setParsingFile(false);
    e.target.value = '';
  };

  const removeRecipient = (r: string) => {
    setData(prev => ({ ...prev, recipients: prev.recipients.filter(item => item !== r) }));
  };

  const addJointSigner = () => {
    if (newSigner.position && newSigner.fullName) {
      const signerWithId = { ...newSigner, id: Date.now().toString() };
      setData(prev => ({ ...prev, jointSigners: [...prev.jointSigners, signerWithId] }));
      setNewSigner({ id: '', position: '', fullName: '' });
      setShowAddSigner(false);
    }
  };

  const removeJointSigner = (id: string) => {
    setData(prev => ({ ...prev, jointSigners: prev.jointSigners.filter(s => s.id !== id) }));
  };

  // ==================== GLOBAL HEADER ====================
  const renderHeader = () => (
    <div className="px-4 py-2.5 flex items-center justify-between shadow-lg no-print sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #0f1b34 0%, #1e3a8a 60%, #f97316 100%)' }}>
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-yellow-300" />
        <span className="font-bold text-sm text-white font-sans hidden sm:inline">Trợ lý AI Soạn thảo văn bản hành chính</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowModelSelector(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-[11px] font-medium text-white transition-colors backdrop-blur-sm"
        >
          <Monitor size={13} />
          <span className="hidden sm:inline">{selectedModel.replace('gemini-', '').replace('-preview', '')}</span>
        </button>
        <button
          onClick={() => setShowApiKeyModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-400 hover:bg-orange-300 rounded-lg transition-colors shadow-md"
        >
          <Settings size={13} className="text-purple-800" />
          <span className="text-[11px] font-bold text-purple-800">
            {apiKey ? 'API Key' : 'Lấy API key để sử dụng app'}
          </span>
        </button>
      </div>
    </div>
  );

  // ==================== RENDER MODALS ====================
  const renderModals = () => (
    <>
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={apiKey ? () => setShowApiKeyModal(false) : undefined}
        onSave={handleSaveApiKey}
        currentKey={apiKey}
        canClose={!!apiKey}
      />
      <ModelSelector
        isOpen={showModelSelector}
        onClose={() => setShowModelSelector(false)}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
      />
    </>
  );

  // ==================== DASHBOARD VIEW ====================
  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {renderHeader()}
        <Dashboard
          documents={documents}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateNew={handleCreateNew}
          onView={handleView}
          onCopy={handleCopy}
          onDelete={handleDelete}
        />
        {renderModals()}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F0F2F5] text-[#141414] font-sans overflow-hidden">
      {renderHeader()}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Form */}
        <div className={`${showMobilePreview ? 'hidden' : 'flex'} md:flex w-full md:w-[400px] flex-shrink-0 bg-white border-r border-[#141414]/10 flex-col shadow-xl z-10`} id="editor-panel">
          <div className="p-3 border-b border-purple-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #667eea10, #764ba210)' }}>
            <div className="flex items-center gap-2">
              <button onClick={() => setView('dashboard')} className="p-1.5 hover:bg-purple-100 rounded-lg text-purple-600 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <span className="font-bold text-sm text-purple-700">Quay lại Trang chủ</span>
            </div>
            {/* Mobile: toggle preview */}
            <button
              onClick={() => setShowMobilePreview(true)}
              className="mobile-preview-toggle items-center gap-1.5 px-3 py-1.5 bg-[#C1272D] text-white rounded-lg text-[10px] font-bold"
            >
              <Eye size={12} />
              Xem trước
            </button>
          </div>
          {/* Tabs */}
          <div className="flex border-b border-[#141414]/10 bg-white sticky top-0 z-20">
            {[
              { id: 1, label: '1. Chuẩn bị', icon: Settings },
              { id: 2, label: '2. Soạn thảo', icon: Sparkles },
              { id: 3, label: '3. Hoàn chỉnh', icon: Edit3 },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setStep(t.id)}
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border-b-2 ${step === t.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-purple-400'
                  }`}
              >
                <t.icon size={12} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold">Thiết lập ban đầu</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/60">HÌNH THỨC VĂN BẢN</label>
                      <select
                        value={data.documentFormat}
                        onChange={e => setData(prev => {
                          const newFormat = e.target.value as 'NHÀNƯỚC' | 'ĐẢNG';
                          // Reset loại văn bản khi đổi hình thức
                          const defaultType = newFormat === 'NHÀNƯỚC' ? 'CÔNG VĂN' : 'CÔNG VĂN';
                          return { ...prev, documentFormat: newFormat, type: defaultType as DocumentType };
                        })}
                        className="w-full p-2.5 bg-[#F8F9FA] border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                      >
                        <option value="NHÀNƯỚC">Hành chính</option>
                        <option value="ĐẢNG">Văn bản Đảng</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/60">LOẠI VĂN BẢN</label>
                      <select
                        value={data.type}
                        onChange={e => setData(prev => ({ ...prev, type: e.target.value as DocumentType }))}
                        className="w-full p-2.5 bg-[#F8F9FA] border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                      >
                        {data.documentFormat === 'NHÀNƯỚC' ? (
                          <>
                            <option value="THÔNG BÁO">THÔNG BÁO</option>
                            <option value="KẾ HOẠCH">KẾ HOẠCH</option>
                            <option value="QUYẾT ĐỊNH">QUYẾT ĐỊNH</option>
                            <option value="CÔNG VĂN">CÔNG VĂN</option>
                            <option value="TỜ TRÌNH">TỜ TRÌNH</option>
                            <option value="BÁO CÁO">BÁO CÁO</option>
                            <option value="BIÊN BẢN">BIÊN BẢN</option>
                            <option value="GIẤY MỜI">GIẤY MỜI</option>
                          </>
                        ) : (
                          <>
                            <option value="QUYẾT ĐỊNH">QUYẾT ĐỊNH</option>
                            <option value="THÔNG BÁO">THÔNG BÁO</option>
                            <option value="NGHỊ QUYẾT">NGHỊ QUYẾT</option>
                            <option value="CÔNG VĂN">CÔNG VĂN</option>
                            <option value="GIẤY MỜI">GIẤY MỜI</option>
                            <option value="KẾT LUẬN">KẾT LUẬN</option>
                            <option value="QUY CHẾ">QUY CHẾ</option>
                            <option value="CHƯƠNG TRÌNH">CHƯƠNG TRÌNH</option>
                            <option value="BIÊN BẢN">BIÊN BẢN</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={data.isJoint}
                            onChange={e => setData(prev => ({ ...prev, isJoint: e.target.checked }))}
                            className="sr-only"
                          />
                          <div className={`w-10 h-5 rounded-full transition-colors ${data.isJoint ? 'bg-[#C1272D]' : 'bg-[#141414]/10'}`} />
                          <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${data.isJoint ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 group-hover:text-[#141414]">VĂN BẢN CÓ 02 ĐƠN VỊ CÙNG KÝ</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/60">TÊN VĂN BẢN</label>
                    <input
                      type="text"
                      value={data.name}
                      onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ví dụ: Thông báo kết luận họp giao ban"
                      className="w-full p-2.5 bg-[#F8F9FA] border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                    />
                  </div>

                  <div className="p-4 border-l-4 border-[#C1272D] bg-[#F8F9FA] rounded-r-lg space-y-4">
                    <p className="text-xs font-bold">Đơn vị ban hành chính</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">CƠ QUAN CHỦ QUẢN</label>
                        <AutocompleteInput
                          value={data.parentAgency}
                          onChange={v => setData(prev => ({ ...prev, parentAgency: v }))}
                          onBlur={() => fieldHistory.addToHistory(FIELD_KEYS.PARENT_AGENCY, data.parentAgency)}
                          suggestions={historyFor(FIELD_KEYS.PARENT_AGENCY)}
                          placeholder="Ví dụ: UBND TỈNH LÂM ĐỒNG"
                          className="w-full p-2.5 pr-8 bg-white border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">MÃ ĐƠN VỊ</label>
                        <AutocompleteInput
                          value={data.unitCode}
                          onChange={v => setData(prev => ({ ...prev, unitCode: v }))}
                          onBlur={() => fieldHistory.addToHistory(FIELD_KEYS.UNIT_CODE, data.unitCode)}
                          suggestions={historyFor(FIELD_KEYS.UNIT_CODE)}
                          placeholder="Ví dụ: SCT"
                          className="w-full p-2.5 pr-8 bg-white border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">CƠ QUAN BAN HÀNH</label>
                        <AutocompleteInput
                          value={data.issuingAgency}
                          onChange={v => setData(prev => ({ ...prev, issuingAgency: v }))}
                          onBlur={() => fieldHistory.addToHistory(FIELD_KEYS.ISSUING_AGENCY, data.issuingAgency)}
                          suggestions={historyFor(FIELD_KEYS.ISSUING_AGENCY)}
                          placeholder="Ví dụ: SỞ CÔNG THƯƠNG"
                          className="w-full p-2.5 pr-8 bg-white border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">VIẾT TẮT TÊN PHÒNG</label>
                        <AutocompleteInput
                          value={data.issuingAgencyAbbr}
                          onChange={v => setData(prev => ({ ...prev, issuingAgencyAbbr: v }))}
                          onBlur={() => fieldHistory.addToHistory(FIELD_KEYS.ISSUING_AGENCY_ABBR, data.issuingAgencyAbbr)}
                          suggestions={historyFor(FIELD_KEYS.ISSUING_AGENCY_ABBR)}
                          placeholder="Ví dụ: VP"
                          className="w-full p-2.5 pr-8 bg-white border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/60">ĐỊA DANH</label>
                      <AutocompleteInput
                        value={data.location}
                        onChange={v => setData(prev => ({ ...prev, location: v }))}
                        onBlur={() => fieldHistory.addToHistory(FIELD_KEYS.LOCATION, data.location)}
                        suggestions={historyFor(FIELD_KEYS.LOCATION)}
                        placeholder="Ví dụ: Lâm Đồng"
                        className="w-full p-2.5 pr-8 bg-[#F8F9FA] border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/60">NGÀY BAN HÀNH</label>
                      <input
                        type="date"
                        value={data.issueDate}
                        onChange={e => setData(prev => ({ ...prev, issueDate: e.target.value }))}
                        className="w-full p-2.5 bg-[#F8F9FA] border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/60">SỐ VĂN BẢN</label>
                      <input
                        type="text"
                        value={data.docNumber}
                        onChange={e => setData(prev => ({ ...prev, docNumber: e.target.value }))}
                        className="w-full p-2.5 bg-[#F8F9FA] border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/60">TỶ LỆ HEADER (%)</label>
                      <input
                        type="range"
                        min="30"
                        max="70"
                        value={data.headerRatio}
                        onChange={e => setData(prev => ({ ...prev, headerRatio: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-[#141414]/10 rounded-lg appearance-none cursor-pointer accent-[#C1272D] mt-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-bold">Người ký (Chủ trì)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">CHỨC VỤ</label>
                        <AutocompleteInput
                          value={data.mainSigner.position}
                          onChange={v => setData(prev => ({ ...prev, mainSigner: { ...prev.mainSigner, position: v } }))}
                          onBlur={() => fieldHistory.addToHistory(FIELD_KEYS.SIGNER_POSITION, data.mainSigner.position)}
                          suggestions={historyFor(FIELD_KEYS.SIGNER_POSITION)}
                          placeholder="Ví dụ: GIÁM ĐỐC"
                          className="w-full p-2.5 pr-8 bg-[#F8F9FA] border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">HỌ TÊN</label>
                        <AutocompleteInput
                          value={data.mainSigner.fullName}
                          onChange={v => setData(prev => ({ ...prev, mainSigner: { ...prev.mainSigner, fullName: v } }))}
                          onBlur={() => fieldHistory.addToHistory(FIELD_KEYS.SIGNER_NAME, data.mainSigner.fullName)}
                          suggestions={historyFor(FIELD_KEYS.SIGNER_NAME)}
                          placeholder="Ví dụ: Trương Văn A"
                          className="w-full p-2.5 pr-8 bg-[#F8F9FA] border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!data.mainSigner.ktGiamDoc}
                          onChange={e => setData(prev => ({
                            ...prev,
                            mainSigner: {
                              ...prev.mainSigner,
                              ktGiamDoc: e.target.checked ? 'PHÓ GIÁM ĐỐC' : undefined
                            }
                          }))}
                          className="w-4 h-4 accent-[#C1272D]"
                        />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">PHÓ GIÁM ĐỐC</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!data.mainSigner.ktBiThu}
                          onChange={e => setData(prev => ({
                            ...prev,
                            mainSigner: {
                              ...prev.mainSigner,
                              ktBiThu: e.target.checked ? 'PHÓ BÍ THƯ' : undefined
                            }
                          }))}
                          className="w-4 h-4 accent-[#C1272D]"
                        />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">
                          PHÓ BÍ THƯ
                        </span>
                      </label>
                    </div>

                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold">Nơi nhận</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newRecipient}
                          onChange={e => setNewRecipient(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addRecipient()}
                          placeholder="Thêm nơi nhận..."
                          className="p-1.5 bg-[#F8F9FA] border border-[#141414]/10 rounded text-[10px] outline-none"
                        />
                        <button onClick={addRecipient} className="p-1.5 bg-[#C1272D] text-white rounded hover:bg-[#A11F24]">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.recipients.map((r, i) => (
                        <span key={i} className="px-2 py-1 bg-[#141414]/5 rounded-full text-[10px] flex items-center gap-1">
                          {r}
                          <button onClick={() => removeRecipient(r)} className="hover:text-[#C1272D]"><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold">THÔNG TIN NGƯỜI KÝ THỨ HAI</p>
                      <button
                        onClick={() => setShowAddSigner(true)}
                        className="text-[10px] font-bold text-[#C1272D] hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} /> Thêm người ký
                      </button>
                    </div>
                    {showAddSigner && (
                      <div className="p-3 bg-[#F8F9FA] border border-[#141414]/10 rounded-lg space-y-3">
                        <input
                          type="text"
                          placeholder="Chức vụ"
                          value={newSigner.position}
                          onChange={e => setNewSigner(prev => ({ ...prev, position: e.target.value }))}
                          className="w-full p-2 bg-white border border-[#141414]/10 rounded text-xs outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Họ tên"
                          value={newSigner.fullName}
                          onChange={e => setNewSigner(prev => ({ ...prev, fullName: e.target.value }))}
                          className="w-full p-2 bg-white border border-[#141414]/10 rounded text-xs outline-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setShowAddSigner(false)} className="flex-1 py-1.5 text-[10px] border border-[#141414]/10 rounded">Hủy</button>
                          <button onClick={addJointSigner} className="flex-1 py-1.5 text-[10px] bg-[#C1272D] text-white rounded">Xác nhận</button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {data.jointSigners.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 bg-[#141414]/5 rounded text-[10px]">
                          <div>
                            <p className="font-bold">{s.position}</p>
                            <p>{s.fullName}</p>
                          </div>
                          <button onClick={() => removeJointSigner(s.id)} className="text-[#141414]/40 hover:text-[#C1272D]"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleReset}
                      className="flex-1 py-3 border border-[#141414]/10 text-[#141414]/60 rounded-xl font-bold hover:bg-[#141414]/5 transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      <RefreshCw size={14} />
                      Làm mới
                    </button>
                    <button
                      onClick={handleNext}
                      className="flex-[2] py-3 bg-[#C1272D] text-white rounded-xl font-bold hover:bg-[#A11F24] transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      Tiếp tục
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold">Nhập tóm tắt trích yếu Yêu cầu và những ý chính nội dung cần làm để AI thực hiện</h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">TÀI LIỆU THAM KHẢO (TÙY CHỌN)</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".docx,.pdf,.xlsx,.xls,.csv,.txt,.md,.json,.xml,.html,.rtf,.mp3,.wav,.m4a,.ogg,.aac,.flac,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.pptx,.doc"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${data.referenceFiles && data.referenceFiles.length > 0
                            ? 'border-[#C1272D] bg-[#C1272D]/5'
                            : 'border-[#141414]/10 hover:border-[#C1272D]/40 hover:bg-[#141414]/5'
                            }`}
                        >
                          {parsingFile ? (
                            <div className="flex flex-col items-center gap-2">
                              <RefreshCw size={24} className="animate-spin text-[#C1272D]" />
                              <p className="text-xs font-medium text-[#C1272D]">Đang đọc tài liệu...</p>
                            </div>
                          ) : data.referenceFiles && data.referenceFiles.length > 0 ? (
                            <div className="flex flex-col items-center gap-2 text-center">
                              <Check size={24} className="text-[#C1272D]" />
                              <p className="text-xs font-bold text-[#C1272D]">Đã tải {data.referenceFiles.length} tài liệu</p>
                              <p className="text-[10px] text-[#141414]/60">Bấm để tải thêm tài liệu khác</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-center">
                              <Upload size={24} className="text-[#141414]/40" />
                              <p className="text-xs font-medium">Tải lên nhiều file cùng lúc (Word, PDF, Excel, Ảnh, Âm thanh, TXT...)</p>
                              <p className="text-[10px] text-[#141414]/40">Hỗ trợ: .docx .pdf .xlsx .csv .txt .jpg .png .mp3 và nhiều định dạng khác</p>
                            </div>
                          )}
                        </label>
                      </div>
                      {data.referenceFiles && data.referenceFiles.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {data.referenceFiles.map((file, index) => (
                            <div key={index} className="text-xs font-medium text-[#141414]/80 flex items-center justify-between bg-[#F8F9FA] p-2 rounded-lg border border-[#141414]/10">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <FileText size={14} className="text-[#C1272D] shrink-0" />
                                <span className="truncate">{file.name}</span>
                              </div>
                              <button
                                onClick={() => setData(prev => ({
                                  ...prev,
                                  referenceFiles: prev.referenceFiles.filter((_, i) => i !== index)
                                }))}
                                className="p-1 hover:text-[#C1272D] shrink-0"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/60">TRÍCH YẾU NỘI DUNG</label>
                      <AutocompleteInput
                        value={data.subject}
                        onChange={v => setData(prev => ({ ...prev, subject: v }))}
                        onBlur={() => fieldHistory.addToHistory(FIELD_KEYS.SUBJECT, data.subject)}
                        suggestions={historyFor(FIELD_KEYS.SUBJECT)}
                        placeholder="Ví dụ: Tổ chức Hội nghị tổng kết năm 2026"
                        className="w-full p-2.5 pr-8 bg-[#F8F9FA] border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/60">YÊU CẦU CHI TIẾT CHO AI</label>
                      <textarea
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        placeholder="Nhập các ý chính bạn muốn AI đưa vào văn bản..."
                        className="w-full h-48 p-4 bg-[#F8F9FA] border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D] resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <div className="flex gap-3">
                      <button
                        onClick={handleBack}
                        className="flex-1 py-3 border border-[#141414]/10 text-[#141414]/60 rounded-xl font-bold hover:bg-[#141414]/5 transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        <ChevronLeft size={14} />
                        Quay lại
                      </button>
                      <button
                        onClick={handlePreview}
                        disabled={loading || !aiPrompt.trim()}
                        className={`flex-1 py-3 bg-[#5A5A40] text-white rounded-xl font-bold hover:bg-[#4A4A35] transition-all flex items-center justify-center gap-2 text-xs ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />}
                        {loading ? 'Đang tạo...' : 'Xem trước'}
                      </button>
                    </div>
                    <button
                      onClick={handleGenerate}
                      disabled={loading || !aiPrompt.trim()}
                      className={`w-full py-3 bg-[#C1272D] text-white rounded-xl font-bold hover:bg-[#A11F24] transition-all flex items-center justify-center gap-2 text-xs ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {loading ? 'Đang tạo...' : 'Tạo nội dung và Tiếp tục'}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold">Hoàn chỉnh nội dung dự thảo do AI tạo để phù hợp với văn phong hành chính trước khi sử dụng chính thức.</h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/60">NỘI DUNG VĂN BẢN AI</label>
                      <textarea
                        value={data.content}
                        onChange={e => setData(prev => ({ ...prev, content: e.target.value }))}
                        className="w-full h-[400px] p-4 bg-[#F8F9FA] border border-[#141414]/10 rounded-lg text-sm outline-none focus:border-[#C1272D] resize-none font-serif leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <div className="flex gap-3">
                      <button
                        onClick={handleBack}
                        className="flex-1 py-3 border border-[#141414]/10 text-[#141414]/60 rounded-xl font-bold hover:bg-[#141414]/5 transition-all text-xs"
                      >
                        Quay lại
                      </button>
                      <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className={`flex-[2] py-3 bg-[#5A5A40] text-white rounded-xl font-bold hover:bg-[#4A4A35] transition-all flex items-center justify-center gap-2 text-xs ${downloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {downloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                        {downloading ? 'Đang xuất...' : 'Tải file Word'}
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(data.content);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="w-full py-3 bg-[#141414] text-white rounded-xl font-bold hover:bg-[#000] transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Đã sao chép' : 'Sao chép nội dung'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile: Back from preview button */}
        {showMobilePreview && (
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 p-3 flex items-center gap-2 shadow-sm">
            <button
              onClick={() => setShowMobilePreview(false)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft size={14} />
              Quay lại chỉnh sửa
            </button>
          </div>
        )}

        {/* Right Side: Live Preview */}
        <PreviewPanel data={data} showSaved={showSaved} />

        {/* Mobile Preview (fullscreen overlay) */}
        {showMobilePreview && (
          <div className="md:hidden fixed inset-0 z-40 bg-[#F0F2F5] overflow-y-auto pt-14">
            <PreviewPanel data={data} showSaved={showSaved} />
          </div>
        )}
      </div>

      {renderModals()}
    </div>
  );
}
