export type DocumentType = 'CÔNG VĂN' | 'THÔNG BÁO' | 'QUYẾT ĐỊNH' | 'TỜ TRÌNH' | 'BÁO CÁO' | 'BIÊN BẢN' | 'KẾ HOẠCH' | 'GIẤY MỜI' | 'NGHỊ QUYẾT' | 'KẾT LUẬN' | 'QUY CHẾ' | 'CHƯƠNG TRÌNH';

export type DocumentFormat = 'NHÀNƯỚC' | 'ĐẢNG';

export interface Signer {
  id: string;
  position: string;
  fullName: string;
  ktChibo?: string; //BÍ THƯ
  ktGiamDoc?: string; // PHÓ GIÁM ĐỐC field
  KtBiThu?: string; // PHÓ BÍ THƯ
}

export interface ReferenceFile {
  name: string;
  content: string;
  mimeType?: string;
  data?: string;
}

export interface AdministrativeDocumentData {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  format: string;
  documentFormat: DocumentFormat;
  type: DocumentType;
  name: string;
  parentAgency: string;
  issuingAgency: string;
  issuingAgencyAbbr?: string;
  unitCode: string;
  isJoint: boolean;
  location: string;
  issueDate: string;
  docNumber: string;
  headerRatio: number; // 0 to 100 (percentage for agency side)
  recipients: string[];
  mainSigner: Signer;
  jointSigners: Signer[];
  subject: string;
  content: string;
  referenceFiles: ReferenceFile[];
}

export const INITIAL_DOCUMENT_DATA: AdministrativeDocumentData = {
  format: 'Hành chính (Nghị định 30/2020/NĐ-CP)',
  documentFormat: 'NHÀNƯỚC',
  type: 'CÔNG VĂN',
  name: '',
  parentAgency: '',
  issuingAgency: '',
  issuingAgencyAbbr: '',
  unitCode: '',
  isJoint: false,
  location: 'Lâm Đồng',
  issueDate: new Date().toISOString().split('T')[0],
  docNumber: '   ',
  headerRatio: 35,
  recipients: [],
  mainSigner: { id: 'main', position: '', fullName: '' },
  jointSigners: [],
  subject: '',
  content: '',
  referenceFiles: [],
};
