import { GoogleGenAI } from "@google/genai";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  VerticalAlign,
  UnderlineType
} from "docx";
import { saveAs } from "file-saver";
import { AdministrativeDocumentData } from "../types";

// ==================== API KEY MANAGEMENT ====================

const API_KEY_STORAGE_KEY = 'gemini_api_key';
const MODEL_STORAGE_KEY = 'gemini_selected_model';

// Danh sách model theo LỆNH.md với cơ chế fallback
const FALLBACK_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
];

// Danh sách model UI theo LỆNH.md mục 2
export const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Mặc định — Nhanh, reasoning mạnh', badge: 'Default' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Chất lượng cao nhất, phù hợp phân tích sâu', badge: 'Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Cân bằng chi phí/hiệu năng', badge: 'Balanced' },
];

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function removeApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function getSelectedModel(): string {
  return localStorage.getItem(MODEL_STORAGE_KEY) || 'gemini-3-flash-preview';
}

export function setSelectedModel(model: string): void {
  localStorage.setItem(MODEL_STORAGE_KEY, model);
}

function createAI(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

// ==================== GENERATE CONTENT WITH FALLBACK ====================

export async function generateDocumentContent(
  data: AdministrativeDocumentData,
  prompt: string,
  apiKey?: string,
  preferredModel?: string
): Promise<string> {
  const key = apiKey || getApiKey();
  if (!key) {
    throw new Error('API_KEY_MISSING');
  }

  const ai = createAI(key);
  const selectedModel = preferredModel || getSelectedModel();

  // Xây dựng danh sách fallback: model được chọn trước, sau đó các model còn lại
  const modelsToTry = [selectedModel, ...FALLBACK_MODELS.filter(m => m !== selectedModel)];

  const parts: any[] = [];

  let textPrompt = `Bạn là một chuyên gia soạn thảo văn bản hành chính trong cơ quan nhà nước và cơ quan Đảng, am hiểu sâu sắc Nghị định 30/2020/NĐ-CP và Hướng dẫn số 36-HD/TW năm 2018.
Dựa trên các thông tin thiết lập sau:
- Loại văn bản: ${data.type}
- Tên văn bản: ${data.name}
- Cơ quan ban hành: ${data.issuingAgency}
- Trích yếu: ${data.subject || 'Chưa có'}

Yêu cầu: Hãy soạn thảo nội dung chi tiết cho văn bản này dựa trên yêu cầu bổ sung sau:
"${prompt}"\n\n`;

  if (data.referenceFiles && data.referenceFiles.length > 0) {
    textPrompt += `ĐẶC BIỆT QUAN TRỌNG: Dưới đây là nội dung tham khảo từ các tài liệu đính kèm. Bạn PHẢI phân tích từng nội dung (bao gồm cả việc nghe/trích xuất thông tin từ file âm thanh nếu có), căn cứ, bám sát tối đa và sử dụng thông tin từ các tài liệu này để thực hiện trình soạn thảo văn bản:\n`;

    data.referenceFiles.forEach((file, index) => {
      if (file.mimeType && file.data) {
        parts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data
          }
        });
        textPrompt += `\n--- Tài liệu ${index + 1}: ${file.name} (File âm thanh đính kèm) ---\n`;
      } else {
        textPrompt += `\n--- Tài liệu ${index + 1}: ${file.name} ---\n"""\n${file.content}\n"""\n`;
      }
    });
  }

  textPrompt += `\nQuy tắc soạn thảo:
1. Văn phong: Trang trọng, khách quan, chính xác, sử dụng thuật ngữ hành chính nhà nước chuẩn đối với hình thức văn bản Hành chính và văn phong, thuật ngữ của cơ quan Đảng đối với hình thức văn bản Đảng.
2. Cấu trúc:
   - Nếu là QUYẾT ĐỊNH: Phải có phần "Căn cứ..." được in nghiêng (ít nhất 2 căn cứ liên quan), sau đó là "QUYẾT ĐỊNH:", tiếp theo là các Điều (Điều 1, Điều 2...). Dùng từ "Theo đề nghị", không dùng "Xét đề nghị". Chỉ dùng bold cho Điều 1, Điều 2... Không bold cho nội dung các điều.
   - Nếu là THÔNG BÁO: Không có phần "Kính gửi". Nội dung rõ ràng, mạch lạc, có phần mở đầu nêu lý do, phần nội dung chính và phần kết luận thực hiện.
   - Nếu là CÔNG VĂN: Phải có phần "Kính gửi", phần kính gửi được canh giữa theo lề giấy chuẩn của từng loại văn bản Hành chính hoặc văn bản Đảng. Nội dung rõ ràng, mạch lạc, có phần căn cứ để phát hành công văn, phần nội dung chính và phần kết luận/yêu cầu thực hiện.
   - Nếu là TỜ TRÌNH: Phải có phần "Kính gửi", nêu lý do tờ trình, nội dung đề xuất và kiến nghị. Nếu có Căn cứ thì không cần in nghiêng.
   - Nếu là GIẤY MỜI: Không có phần "Kính gửi". Nội dung bao gồm Thành phần tham dự, Nội dung họp, Thời gian và địa điểm. Nói dung rõ ràng, bôi đậm bold tại mục thời gian để nhấn mạnh tính quan trọng.
   - Nếu là BIÊN BẢN: Ghi rõ thời gian, địa điểm, thành phần tham dự, nội dung diễn biến (dựa trên file âm thanh/tài liệu nếu có), và kết luận.
   - Nếu là KẾT LUẬN: ghi rõ trích yếu nội dung kết luận, tùy nội dung kết luận mà trình bày các thành phần của văn bản đảm bảo theo hướng dẫn số 36-HD/TW
3. Chỉ trả về nội dung phần thân văn bản (từ phần Căn cứ hoặc Kính gửi đến hết nội dung chính). KHÔNG bao gồm quốc hiệu, tiêu ngữ, tên cơ quan, số hiệu hay phần ký tên.
4. TUYỆT ĐỐI KHÔNG sử dụng định dạng Markdown (như dấu * hay **). Trả về văn bản thuần túy.`;

  parts.push({ text: textPrompt });

  // Retry với fallback models
  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            role: "user",
            parts: parts
          }
        ]
      });

      return (response.text || "").replace(/\*/g, '');
    } catch (err: any) {
      lastError = err;
      const errorMessage = err?.message || err?.toString() || '';

      // Nếu là lỗi API key không hợp lệ, dừng ngay
      if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401')) {
        throw new Error('API_KEY_INVALID');
      }

      // Nếu hết quota
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
        // Thử model tiếp theo, nếu hết model thì báo lỗi quota
        console.warn(`Model ${model} hết quota, thử model tiếp theo...`);
        continue;
      }

      // Lỗi khác (model không tồn tại, server error...) → thử model tiếp
      console.warn(`Model ${model} lỗi: ${errorMessage}, thử model tiếp theo...`);
      continue;
    }
  }

  // Tất cả model đều thất bại
  const errorStr = lastError?.message || lastError?.toString() || '';
  if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('quota')) {
    throw new Error('QUOTA_EXHAUSTED');
  }
  throw new Error(`Tất cả model đều thất bại. Lỗi cuối: ${errorStr}`);
}

// ==================== EXPORT TO WORD ====================

function isSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  return /^(I{1,3}V?|V?I{0,3})\.\s/.test(trimmed) ||
    /^Điều\s+\d+/.test(trimmed) ||
    /^(QUYẾT ĐỊNH|KẾT LUẬN|KIẾN NGHỊ)/.test(trimmed) ||
    (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-ZÀ-Ỹ]/.test(trimmed));
}

function buildContentParagraphs(content: string, documentFormat?: string, type?: string): Paragraph[] {
  const lines = content.split("\n");
  const paragraphs: Paragraph[] = [];
  let prevWasEmpty = false;

  for (const line of lines) {
    if (line.trim() === '') {
      prevWasEmpty = true;
      continue;
    }

    const isHeading = isSectionHeading(line);
    const isCanCu = /^(Căn cứ|Theo đề nghị)/.test(line.trim());
    // In nghiêng Căn cứ chỉ khi: Văn bản Đảng HOẶC (Văn bản Hành chính AND loại Quyết định)
    const shouldItalicizeCanCu = isCanCu && (
     documentFormat === 'HÀNH CHÍNH' && type === 'QUYẾT ĐỊNH'
    );
    const spacingBefore = isHeading ? 200 : (prevWasEmpty ? 120 : 60);

    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: isHeading ? undefined : { firstLine: 720 },
        contextualSpacing: true,
        spacing: {
          before: spacingBefore,
          after: 60,
          line: 300,
          lineRule: "auto"
        },
        children: [
          new TextRun({
            text: line,
            bold: isHeading,
            italics: shouldItalicizeCanCu,
            size: 28,
            font: "Times New Roman"
          })
        ],
      })
    );
    prevWasEmpty = false;
  }
  return paragraphs;
}

export async function exportToWord(docData: AdministrativeDocumentData) {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: docData.documentFormat === 'ĐẢNG' ? 1134 : 1134, // 2cm for both
              right: docData.documentFormat === 'ĐẢNG' ? 851 : 1134, // 1.5cm for Đảng, 2cm for Nhà nước
              bottom: docData.documentFormat === 'ĐẢNG' ? 1134 : 1134, // 2cm for both
              left: docData.documentFormat === 'ĐẢNG' ? 1701 : 1701, // 3cm for both
            },
          },
        },
        children: [
          // Header: Organ Name and National Motto
          ...(docData.documentFormat === 'NHÀNƯỚC' ? [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: docData.headerRatio, type: WidthType.PERCENTAGE },
                      children: [
                        ...(docData.parentAgency ? [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: docData.parentAgency.toUpperCase(), size: 26, font: "Times New Roman" }),
                            ],
                          })
                        ] : []),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: docData.issuingAgency.toUpperCase(), bold: true, size: 26, font: "Times New Roman" }),
                          ],
                        }),

                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "⎯⎯⎯⎯⎯⎯⎯⎯", size: 24, font: "Times New Roman" }),
                          ],
                        }),

                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({
                              text: `Số: ${docData.type === 'CÔNG VĂN'
                                ? `${docData.docNumber}/${docData.unitCode || docData.issuingAgencyAbbr}-${docData.issuingAgencyAbbr}`
                                : (
                                  `${docData.docNumber}/${docData.type === 'THÔNG BÁO' ? 'TB' :
                                    docData.type === 'QUYẾT ĐỊNH' ? 'QĐ' :
                                      docData.type === 'TỜ TRÌNH' ? 'TTr' :
                                        docData.type === 'BÁO CÁO' ? 'BC' :
                                          docData.type === 'BIÊN BẢN' ? 'BB' :
                                            docData.type === 'KẾ HOẠCH' ? 'KH' :
                                              docData.type === 'GIẤY MỜI' ? 'GM' : ''
                                  }-${docData.unitCode}`
                                )
                                }`,
                              size: 28,
                              font: "Times New Roman"
                            }),

                          ],
                        }),
                        // V/v section for CÔNG VĂN
                        ...(docData.type === 'CÔNG VĂN' && docData.subject ? [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: `V/v ${docData.subject}`,
                                size: 26,
                                font: "Times New Roman"
                              }),
                            ],
                          })
                        ] : []),
                      ],
                    }),
                    new TableCell({
                      width: { size: 100 - docData.headerRatio, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, size: 26, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", bold: true, size: 28, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯", size: 24, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: `${docData.location}, ngày   tháng ${new Date(docData.issueDate).getMonth() + 1} năm ${new Date(docData.issueDate).getFullYear()}`, italics: true, size: 28, font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ] : [
            // Header cho Đảng - Bảng 2 cột tương tự văn bản Hành chính
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new TableRow({
                  children: [
                    // Cột trái: Cơ quan chủ quản, cơ quan ban hành, số văn bản
                    new TableCell({
                      width: { size: docData.headerRatio, type: WidthType.PERCENTAGE },
                      children: [
                        ...(docData.parentAgency ? [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: docData.parentAgency.toUpperCase(), size: 28, font: "Times New Roman" }),
                            ],
                          })
                        ] : []),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: docData.issuingAgency.toUpperCase(), bold: true, size: 28, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "*", size: 28, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({
                              text: `Số ${docData.type === 'CÔNG VĂN'
                                ? `${docData.docNumber || ''}-CV/${docData.unitCode}`
                                : `${docData.docNumber}-${docData.type === 'THÔNG BÁO' ? 'TB' :
                                  docData.type === 'QUYẾT ĐỊNH' ? 'QĐ' :
                                    docData.type === 'NGHỊ QUYẾT' ? 'NQ' :
                                      docData.type === 'KẾT LUẬN' ? 'KL' :
                                        docData.type === 'QUY CHẾ' ? 'QC' :
                                          docData.type === 'CHƯƠNG TRÌNH' ? 'CTr' :
                                            docData.type === 'BIÊN BẢN' ? 'BB' :
                                              docData.type === 'GIẤY MỜI' ? 'GM' : ''
                                }/${docData.unitCode}`
                                }`,
                              size: 28,
                              font: "Times New Roman"
                            }),
                          ],
                        }),
                        // V/v section for CÔNG VĂN
                        ...(docData.type === 'CÔNG VĂN' && docData.subject ? [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: docData.subject,
                                italics: true,
                                size: 24,
                                font: "Times New Roman"
                              }),
                            ],
                          })
                        ] : []),
                      ],
                    }),
                    // Cột phải: ĐẢNG CỘNG SẢN VIỆT NAM, địa danh ngày tháng
                    new TableCell({
                      width: { size: 100 - docData.headerRatio, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "ĐẢNG CỘNG SẢN VIỆT NAM", bold: true, size: 30, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯", size: 24, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: `${docData.location}, ngày   tháng ${new Date(docData.issueDate).getMonth() + 1} năm ${new Date(docData.issueDate).getFullYear()}`, italics: true, size: 28, font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ]),

          // Title and Subject - Only show for non-CÔNG VĂN, non-GIẤY MỜI, non-THÔNG BÁO, non-BIÊN BẢN types
          ...(docData.type !== 'CÔNG VĂN' &&
            docData.type !== 'GIẤY MỜI' &&
            docData.type !== 'THÔNG BÁO' &&
            docData.type !== 'BIÊN BẢN' ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 360, after: 0 },
              children: [
                new TextRun({ 
                  text: docData.type.toUpperCase(), 
                  bold: true, 
                  size: ['THÔNG BÁO', 'KẾT LUẬN', 'GIẤY MỜI', 'NGHỊ QUYẾT', 'BIÊN BẢN', 'CHƯƠNG TRÌNH', 'QUYẾT ĐỊNH', 'TỜ TRÌNH'].includes(docData.type) ? 30 : 28,
                  font: "Times New Roman" 
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 200 },
              children: [
                new TextRun({ text: `${docData.subject || '...'}`, bold: true, italics: false, size: 28, font: "Times New Roman" }),
              ],
            }),
          ] : [new Paragraph({
            spacing: { before: 200, after: 0 },
            children: [new TextRun({ text: '' })],
          })]),

  // Content
  ...buildContentParagraphs(docData.content, docData.documentFormat, docData.type),

          // Footer: Nơi nhận and Signer
          ...(docData.type !== 'BIÊN BẢN' ? [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.TOP,
                      children: docData.documentFormat === 'ĐẢNG' ? [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Nơi nhận:", bold: false, underline: { type: UnderlineType.SINGLE }, size: 28, font: "Times New Roman" }),
                          ],
                        }),
                        ...docData.recipients.map((line, index) => {
                          const isLastItem = index === docData.recipients.length - 1;
                          const punctuation = isLastItem ? '.' : ',';
                          return new Paragraph({
                            children: [new TextRun({ text: `- ${line}${punctuation}`, size: 24, font: "Times New Roman" })],
                          });
                        }),
                      ] : [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Nơi nhận:", bold: true, italics: true, size: 24, font: "Times New Roman" }),
                          ],
                        }),
                        ...docData.recipients.map((line, index) => {
                          const isLastItem = index === docData.recipients.length - 1;
                          const punctuation = isLastItem ? '.' : ';';
                          return new Paragraph({
                            children: [new TextRun({ text: `- ${line}${punctuation}`, size: 22, font: "Times New Roman" })],
                          });
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.TOP,
                      children: [
                        // Main Signer - Người ký chính
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: docData.mainSigner.position.toUpperCase(), bold: true, size: 28, font: "Times New Roman" }),
                          ],
                        }),
                        ...(docData.mainSigner.ktChibo || docData.mainSigner.ktGiamDoc || docData.mainSigner.ktBiThu ? [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: (docData.mainSigner.ktChibo || docData.mainSigner.ktGiamDoc || docData.mainSigner.ktBiThu).toUpperCase(), bold: true, size: 28, font: "Times New Roman" }),
                            ],
                          })
                        ] : []),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: " ", italics: true, size: 18, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({ spacing: { before: 1200 } }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: docData.mainSigner.fullName.charAt(0).toUpperCase() + docData.mainSigner.fullName.slice(1), bold: true, size: 28, font: "Times New Roman" }),
                          ],
                        }),

                        // Joint Signers - Người ký thứ 2 dành cho loại khác
                        ...docData.jointSigners.flatMap(signer => [
                          new Paragraph({ spacing: { before: 800 } }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: signer.position.toUpperCase(), bold: true, size: 24, font: "Times New Roman" }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: "(Ký, ghi rõ họ tên và đóng dấu)", italics: true, size: 18, font: "Times New Roman" }),
                            ],
                          }),
                          new Paragraph({ spacing: { before: 1200 } }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: signer.fullName.toUpperCase(), bold: true, size: 24, font: "Times New Roman" }),
                            ],
                          }),
                        ])
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ] : [
            // Footer cho Biên bản: 2 ô ngang hàng
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new TableRow({
                  children: [
                    // Ô bên trái: Người ký thứ 2
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.TOP,
                      children: docData.jointSigners.length > 0 ? [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: docData.jointSigners[0].position.toUpperCase(), bold: true, size: 28, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "(Ký tên, đóng dấu)", italics: true, size: 18, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({ spacing: { before: 1200 } }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: docData.jointSigners[0].fullName.charAt(0).toUpperCase() + docData.jointSigners[0].fullName.slice(1), bold: true, size: 28, font: "Times New Roman" }),
                          ],
                        }),
                      ] : [
                        new Paragraph({ children: [new TextRun({ text: "", size: 28, font: "Times New Roman" })] }),
                      ],
                    }),
                    // Ô bên phải: Người ký chủ trì
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.TOP,
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: docData.mainSigner.position.toUpperCase(), bold: true, size: 28, font: "Times New Roman" }),
                          ],
                        }),
                        ...(docData.mainSigner.ktChibo || docData.mainSigner.ktGiamDoc || docData.mainSigner.ktBiThu ? [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: (docData.mainSigner.ktChibo || docData.mainSigner.ktGiamDoc || docData.mainSigner.ktBiThu).toUpperCase(), bold: true, size: 28, font: "Times New Roman" }),
                            ],
                          })
                        ] : []),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: "(Ký tên, đóng dấu)", italics: true, size: 18, font: "Times New Roman" }),
                          ],
                        }),
                        new Paragraph({ spacing: { before: 1200 } }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: docData.mainSigner.fullName.charAt(0).toUpperCase() + docData.mainSigner.fullName.slice(1), bold: true, size: 28, font: "Times New Roman" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ]),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${docData.type}_${docData.docNumber}.docx`);
}
