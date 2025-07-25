export interface Company {
  id: number;
  name: string;
  created_at: string;
  last_updated_at: string;
  documents_count: number;
}

export interface Signer {
  id: number;
  token: string;
  status: 'PENDING' | 'SIGNED' | 'CANCELLED';
  name: string;
  email: string;
  external_id: string;
  document: number;
}

export interface Document {
  id: number;
  open_id: number | null;
  token: string;
  name: string;
  status: 'PENDING_API' | 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'API_ERROR';
  created_at: string;
  last_updated_at: string;
  created_by: string;
  company: Company;
  external_id: string;
  signers: Signer[];
}

export interface DocumentListItem {
  id: number;
  name: string;
  status: string;
  created_at: string;
  last_updated_at: string;
  created_by: string;
  company_name: string;
  signers_count: number;
}

export interface DocumentCreateRequest {
  name: string;
  pdf_url: string;
  company_id: number;
  created_by: string;
  signers: SignerCreateRequest[];
}

export interface SignerCreateRequest {
  name: string;
  email: string;
}

export interface DocumentUpdateRequest {
  name?: string;
  status?: string;
  created_by?: string;
}
