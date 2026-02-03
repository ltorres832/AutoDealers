// Tipos compartidos

export type Currency = 'USD' | 'EUR' | 'MXN' | 'ARS' | 'CLP' | 'COP';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}





