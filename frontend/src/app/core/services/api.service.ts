import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl: string;

  private defaultHeaders = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // En el browser usar localhost, en el server usar el nombre del servicio Docker
    if (isPlatformBrowser(this.platformId)) {
      this.baseUrl = environment.apiUrl || 'http://localhost:8000/api';
    } else {
      this.baseUrl = 'http://backend:8000/api';
    }
  }

  /**
   * Build normalized URL avoiding double slashes
   */
  private buildUrl(endpoint: string): string {
    // Remove leading slash from endpoint if baseUrl already ends with slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    // Ensure baseUrl ends with slash
    const baseUrlWithSlash = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
    return `${baseUrlWithSlash}${cleanEndpoint}`;
  }

  /**
   * GET request
   */
  get<T>(endpoint: string, params?: HttpParams): Observable<T> {
    const url = this.buildUrl(endpoint);

    return this.http.get<T>(url, {
      headers: this.defaultHeaders,
      params
    }).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(this.buildUrl(endpoint), data, {
      headers: this.defaultHeaders
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(this.buildUrl(endpoint), data, {
      headers: this.defaultHeaders
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, data: any): Observable<T> {
    return this.http.patch<T>(this.buildUrl(endpoint), data, {
      headers: this.defaultHeaders
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(endpoint), {
      headers: this.defaultHeaders
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof Error) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = 'Bad Request - Please check your input';
          break;
        case 401:
          errorMessage = 'Unauthorized - Please login';
          break;
        case 403:
          errorMessage = 'Forbidden - You do not have permission';
          break;
        case 404:
          errorMessage = 'Not Found - Resource does not exist';
          break;
        case 500:
          errorMessage = 'Internal Server Error';
          break;
        case 502:
          errorMessage = 'Service temporarily unavailable';
          break;
        default:
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
      }

      // If server provides detailed error message
      if (error.error && error.error.detail) {
        errorMessage += ` - ${error.error.detail}`;
      }
    }

    console.error('API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
