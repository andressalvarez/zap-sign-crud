import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ZapSignDocument {
  external_id: string;
  open_id: number;
  token: string;
  name: string;
  folder_path: string;
  folder_token: string | null;
  status: 'pending' | 'completed' | 'cancelled' | 'rejected';
  original_file: string;
  signed_file: string | null;
  created_at: string;
  last_update_at: string;
  created_by: {
    email: string;
  };
  signers: ZapSignSigner[];
  deleted: boolean;
  deleted_at: string | null;
}

export interface ZapSignSigner {
  external_id: string;
  sign_url: string;
  token: string;
  status: 'new' | 'signed' | 'refused';
  name: string;
  email: string;
  phone_number: string;
  signed_at: string | null;
  times_viewed: number;
  last_view_at: string | null;
}

export interface ZapSignCreateRequest {
  name: string;
  url_pdf: string;
  signers: {
    name: string;
    email: string;
  }[];
  external_id?: string;
  created_by?: string;
}

export interface ZapSignUpdateRequest {
  name?: string;
  folder_path?: string;
  date_limit_to_sign?: string;
}

export interface ZapSignListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ZapSignDocument[];
}

@Injectable({
  providedIn: 'root'
})
export class ZapSignService {
  private readonly baseUrl = 'https://sandbox.api.zapsign.com.br/api/v1';
  private readonly apiToken = 'fa895995-6797-49fe-8561-35102d37ba9bf44a60bf-0776-4dac-aeb6-cb97f4fc7632';

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    });
  }

  constructor(private http: HttpClient) {}

  /**
   * Crear documento con firmantes
   */
  createDocument(data: ZapSignCreateRequest): Observable<ZapSignDocument> {
    return this.http.post<ZapSignDocument>(`${this.baseUrl}/docs/`, data, {
      headers: this.headers
    });
  }

  /**
   * Listar documentos
   */
  getDocuments(page: number = 1): Observable<ZapSignListResponse> {
    return this.http.get<ZapSignListResponse>(`${this.baseUrl}/docs/?page=${page}`, {
      headers: this.headers
    });
  }

  /**
   * Obtener detalle de documento
   */
  getDocument(token: string): Observable<ZapSignDocument> {
    return this.http.get<ZapSignDocument>(`${this.baseUrl}/docs/${token}/`, {
      headers: this.headers
    });
  }

  /**
   * Actualizar documento
   */
  updateDocument(token: string, data: ZapSignUpdateRequest): Observable<ZapSignDocument> {
    return this.http.put<ZapSignDocument>(`${this.baseUrl}/docs/${token}/`, data, {
      headers: this.headers
    });
  }

  /**
   * Eliminar documento
   */
  deleteDocument(token: string): Observable<ZapSignDocument> {
    return this.http.delete<ZapSignDocument>(`${this.baseUrl}/docs/${token}/`, {
      headers: this.headers
    });
  }
}
