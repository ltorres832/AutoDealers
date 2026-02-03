/**
 * Manejador global de errores para API routes
 * Garantiza que SIEMPRE se retorne JSON válido
 */

import { NextResponse } from 'next/server';

export interface ApiError {
  error: string;
  details?: string;
  stack?: string;
}

/**
 * Crea una respuesta de error garantizada en JSON
 */
export function createErrorResponse(
  error: unknown,
  status: number = 500,
  includeStack: boolean = process.env.NODE_ENV === 'development'
): NextResponse {
  let errorMessage = 'Internal server error';
  let errorDetails: string | undefined;
  let errorStack: string | undefined;

  if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.toString();
    if (includeStack) {
      errorStack = error.stack;
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    errorMessage = (error as any).message || String(error);
  }

  const response: ApiError = {
    error: errorMessage,
    details: errorDetails,
  };

  if (errorStack) {
    response.stack = errorStack;
  }

  // Garantizar que siempre se retorne JSON con el header correcto
  return NextResponse.json(response, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

/**
 * Wrapper para API handlers que garantiza respuestas JSON
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);
      return createErrorResponse(error);
    }
  };
}

/**
 * Crea una respuesta exitosa garantizada en JSON
 */
export function createSuccessResponse<T = any>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}


