import React, { useRef, useEffect, useState } from 'react';
import { Printer, Check } from 'lucide-react';
import { AdministrativeDocumentData, DocumentType } from '../types';

interface PreviewPanelProps {
  data: AdministrativeDocumentData;
  showSaved: boolean;
  className?: string;
}

export default function PreviewPanel({ data, showSaved }: PreviewPanelProps) {
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.offsetWidth;
        const a4Width = 794;
        const newScale = Math.min(Math.max((containerWidth - 64) / a4Width, 0.4), 1.2);
        setPreviewScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const getDocNotation = () => {
    const typeAbbr: Record<DocumentType, string> = {
      'THÔNG BÁO': 'TB',
      'QUYẾT ĐỊNH': 'QĐ',
      'CÔNG VĂN': '',
      'TỜ TRÌNH': 'TTr',
      'BÁO CÁO': 'BC',
      'BIÊN BẢN': 'BB',
      'KẾ HOẠCH': 'KH',
      'GIẤY MỜI': 'GM',
      'NGHỊ QUYẾT': 'NQ',
      'KẾT LUẬN': 'KL',
      'QUY CHẾ': 'QC',
      'CHƯƠNG TRÌNH': 'CTr'
    };

    const abbr = typeAbbr[data.type];

    if (data.documentFormat === 'ĐẢNG') {
      // Định dạng Đảng: Số-loại/mã đơn vị
      if (data.type === 'CÔNG VĂN') {
        return `${data.docNumber}-${abbr || 'CV'}/${data.unitCode}`;
      }
      return `${data.docNumber}-${abbr}/${data.unitCode}`;
    }

    // Định dạng Nhà nước
    if (data.type === 'CÔNG VĂN') {
      return `${data.docNumber}/${data.unitCode || data.issuingAgencyAbbr}-${data.issuingAgencyAbbr}`;
    }
    return `${data.docNumber}/${abbr}-${data.unitCode}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      ref={previewContainerRef}
      className="flex-1 flex-col items-center bg-[#F0F2F5] overflow-y-auto overflow-x-hidden p-4 md:p-8 hidden md:flex print-area"
      id="preview-panel"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
        >
          <Printer size={14} />
          In văn bản
        </button>
        {showSaved && (
          <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium animate-fade-in">
            <Check size={12} />
            Đã lưu nháp
          </span>
        )}
      </div>

      {/* A4 Preview */}
      <div className={`bg-white shadow-2xl w-[210mm] min-h-[297mm] flex flex-col space-y-8 font-serif text-[#141414] relative origin-top transition-transform duration-200 ${data.documentFormat === 'ĐẢNG'
        ? 'pt-[20mm] pb-[20mm] pl-[30mm] pr-[15mm]'
        : 'pt-[20mm] pb-[20mm] pl-[30mm] pr-[20mm]'
        }`}
        style={{
          transform: `scale(${previewScale})`,
          marginBottom: `-${(1 - previewScale) * 1123}px`
        }}>
        {/* Header */}

        {data.documentFormat === 'ĐẢNG' ? (
          <div className="flex justify-between items-start">
            <div className="text-center space-y-1" style={{ width: `${data.headerRatio}%` }}>
              {data.parentAgency && (
                <p className="text-[13pt] font-sans uppercase tracking-tight leading-tight">{data.parentAgency}</p>
              )}
              <p className="text-[13pt] font-sans font-bold uppercase tracking-tight leading-tight">{data.issuingAgency || '[CƠ QUAN BAN HÀNH]'}</p>
              <div className="w-16 h-[1px] bg-[#141414] mx-auto mt-1" />
              <p className="text-[13pt] font-sans mt-1">Số: {getDocNotation()}</p>
              {data.subject && data.type === 'CÔNG VĂN' && (
                <p className="text-[12pt] font-sans italic mt-2">{data.subject}</p>
              )}
            </div>
            <div
              className="text-center space-y-1"
              style={{ width: `${100 - data.headerRatio}%` }}
            >
              <p className="text-[15pt] font-sans font-bold uppercase tracking-tight leading-tight">
                ĐẢNG CỘNG SẢN VIỆT NAM
              </p>
              <div className="w-32 h-[1px] bg-[#141414] mx-auto mt-1" />
              <p className="text-[14pt] font-sans italic mt-2">
                {data.location || '[Địa danh]'}, ngày {new Date(data.issueDate).getDate()} tháng {new Date(data.issueDate).getMonth() + 1} năm {new Date(data.issueDate).getFullYear()}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div className="text-center space-y-1" style={{ width: `${data.headerRatio}%` }}>
              {data.parentAgency && (
                <p className="text-[13pt] font-sans uppercase tracking-tight leading-tight">{data.parentAgency}</p>
              )}
              <p className="text-[13pt] font-sans font-bold uppercase tracking-tight leading-tight">{data.issuingAgency || '[CƠ QUAN BAN HÀNH]'}</p>
              <div className="w-16 h-[1px] bg-[#141414] mx-auto mt-1" />
              <p className="text-[13pt] font-sans mt-1">Số: {getDocNotation()}</p>
              {data.subject && (
                <p className="text-[13pt] font-sans italic mt-2">{data.subject}</p>
              )}
            </div>
            <div className="text-center space-y-1" style={{ width: `${100 - data.headerRatio}%` }}>
              <p className="text-[13pt] font-sans font-bold uppercase tracking-tight leading-tight">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p className="text-[14pt] font-sans font-bold">Độc lập - Tự do - Hạnh phúc</p>
              <div className="w-42 h-[1px] bg-[#141414] mx-auto mt-1" />
              <p className="text-[14pt] font-sans italic mt-2">{data.location || '[Địa danh]'}, ngày {new Date(data.issueDate).getDate()} tháng {new Date(data.issueDate).getMonth() + 1} năm {new Date(data.issueDate).getFullYear()}</p>
            </div>
          </div>
        )}


        {/* Title */}
        <div className="text-center space-y-2 py-8">
          {data.type?.toUpperCase() !== "CÔNG VĂN" && (<h3 className="text-[14pt] font-bold uppercase leading-tight"> {data.type} </h3>)}
          {data.type?.toUpperCase() !== "CÔNG VĂN" && (<p className="text-[14pt] font-bold italic">{data.subject || '...'}</p>)}
          {data.type?.toUpperCase() !== "CÔNG VĂN" && (<div className="w-24 h-[1px] bg-[#141414] mx-auto mt-1" />)}
        </div>

        {/* Body */}
        <div className="text-[14pt] leading-relaxed whitespace-pre-wrap text-justify flex-1 font-serif">
          {data.content || (
            <div className="text-[#141414]/20 italic text-center py-20">
              Nội dung văn bản sẽ hiển thị tại đây sau khi được tạo hoặc nhập thủ công.
            </div>
          )}
        </div>

        {/* Footer */}
        {data.type !== 'BIÊN BẢN' ? (
          <div className="flex justify-between items-start pt-12">
            <div className="space-y-2 w-1/2">
              {data.documentFormat === 'ĐẢNG' ? (
                <div>
                  <p className="text-[14pt] font-sans underline">Nơi nhận:</p>
                  <div className="text-[12pt] font-sans leading-relaxed">
                    {data.recipients.length > 0 ? (
                      data.recipients.map((r, i) => {
                        const isLastItem = i === data.recipients.length - 1;
                        const punctuation = isLastItem ? '.' : ',';
                        return (
                          <p key={i}>- {r}{punctuation}</p>
                        );
                      })
                    ) : (
                      <p className="text-[10pt] font-sans italic opacity-50">Thông tin nơi nhận văn bản</p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[12pt] font-sans font-bold italic">Nơi nhận:</p>
                  <div className="text-[11pt] font-sans leading-relaxed">
                    {data.recipients.length > 0 ? (
                      data.recipients.map((r, i) => {
                        const isLastItem = i === data.recipients.length - 1;
                        const punctuation = isLastItem ? '.' : ';';
                        return (
                          <p key={i}>- {r}{punctuation}</p>
                        );
                      })
                    ) : (
                      <p className="text-[10pt] font-sans italic opacity-50">Thông tin nơi nhận văn bản</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center space-y-16 w-1/2">
              <div className="space-y-1">
                <p className="text-[14pt] font-sans font-bold uppercase">{data.mainSigner.position || '[CHỨC VỤ]'}</p>
                {(data.mainSigner?.ktGiamDoc || data.mainSigner?.ktGiamDoc || data.mainSigner?.ktBiThu) && (
                  <p className="text-[14pt] font-sans font-bold uppercase">{data.mainSigner.ktGiamDoc || data.mainSigner.ktGiamDoc || data.mainSigner.ktBiThu}</p>
                )}
                <p className="text-[10pt] font-sans italic opacity-50">(Ký tên, đóng dấu)</p>
              </div>
              <p className="text-[14pt] font-sans font-bold">{data.mainSigner.fullName || '[Họ và tên]'}</p>

              {data.jointSigners.map((signer) => (
                <div key={signer.id} className="pt-8 space-y-16 border-t border-dashed border-[#141414]/10 mt-8">
                  <div className="space-y-1">
                    <p className="text-[12pt] font-sans font-bold uppercase">{signer.position}</p>
                    <p className="text-[10pt] font-sans italic opacity-50">(Ký tên, đóng dấu)</p>
                  </div>
                  <p className="text-[12pt] font-sans font-bold uppercase">{signer.fullName}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex justify-between gap-8 pt-12">
            {data.jointSigners.length > 0 && (
              <div className="flex-1 text-center space-y-16">
                <div className="space-y-1">
                  <p className="text-[14pt] font-sans font-bold uppercase">{data.jointSigners[0].position}</p>
                  <p className="text-[10pt] font-sans italic opacity-50">(Ký tên, đóng dấu)</p>
                </div>
                <p className="text-[14pt] font-sans font-bold">{data.jointSigners[0].fullName}</p>
              </div>
            )}

            <div className="flex-1 text-center space-y-16">
              <div className="space-y-1">
                <p className="text-[14pt] font-sans font-bold uppercase">{data.mainSigner.position || '[CHỨC VỤ]'}</p>
                {(data.mainSigner?.ktGiamDoc || data.mainSigner?.ktBiThu) && (
                  <p className="text-[14pt] font-sans font-bold uppercase">{data.mainSigner.ktGiamDoc || data.mainSigner.ktBiThu}</p>
                )}
                <p className="text-[10pt] font-sans italic opacity-50">(Ký tên, đóng dấu)</p>
              </div>
              <p className="text-[14pt] font-sans font-bold">{data.mainSigner.fullName || '[Họ và tên]'}</p>
            </div>
          </div>
        )}
      </div>
      <p className="mt-8 text-xs text-[#141414]/40 pb-8 no-print">Hệ thống AI có thể mắc sai sót, thông tin chưa chính xác, có giá trị tham khảo và hỗ trợ cho quá trình soạn thảo là chính. Hãy kiểm tra lại toàn bộ thông tin trước khi trình Sếp nhé bạn ơi.</p>
    </div>
  );
}
