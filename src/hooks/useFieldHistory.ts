/**
 * Hook quản lý lịch sử nhập liệu (field history) lưu vào localStorage.
 * Mỗi field có một key riêng, lưu tối đa N giá trị gần nhất (không trùng).
 */

const HISTORY_PREFIX = 'field_history_';
const MAX_HISTORY = 15;

export interface FieldHistoryManager {
  getHistory: (fieldKey: string) => string[];
  addToHistory: (fieldKey: string, value: string) => void;
  clearHistory: (fieldKey: string) => void;
  clearAllHistory: () => void;
}

export function useFieldHistory(): FieldHistoryManager {
  const getHistory = (fieldKey: string): string[] => {
    try {
      const raw = localStorage.getItem(HISTORY_PREFIX + fieldKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const addToHistory = (fieldKey: string, value: string): void => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 2) return;
    
    const history = getHistory(fieldKey);
    // Xóa giá trị trùng (nếu có), đưa lên đầu
    const filtered = history.filter(item => item !== trimmed);
    filtered.unshift(trimmed);
    // Giới hạn tối đa
    const limited = filtered.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_PREFIX + fieldKey, JSON.stringify(limited));
  };

  const clearHistory = (fieldKey: string): void => {
    localStorage.removeItem(HISTORY_PREFIX + fieldKey);
  };

  const clearAllHistory = (): void => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(HISTORY_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  };

  return { getHistory, addToHistory, clearHistory, clearAllHistory };
}

/**
 * Các field key được sử dụng trong app
 */
export const FIELD_KEYS = {
  PARENT_AGENCY: 'parentAgency',
  ISSUING_AGENCY: 'issuingAgency',
  ISSUING_AGENCY_ABBR: 'issuingAgencyAbbr',
  UNIT_CODE: 'unitCode',
  LOCATION: 'location',
  SIGNER_POSITION: 'signerPosition',
  SIGNER_NAME: 'signerName',
  SUBJECT: 'subject',
  RECIPIENT: 'recipient',
} as const;
