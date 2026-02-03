import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { 
  createAdminUser, 
  getAllAdminUsers, 
  getAdminUser,
} from '@autodealers/core/admin-users-management';
import { hasPermission as hasAdminPermission } from '@autodealers/core/admin-permissions';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET - Obtiene todos los usuarios admin
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    // Obtener el usuario admin actual para verificar permisos
    const currentUser = await getAdminUser(auth.userId);

    if (!currentUser || !hasAdminPermission(currentUser, 'view_admin_users')) {
      return createErrorResponse('No tienes permiso para ver usuarios admin', 403);
    }

    const users = await getAllAdminUsers();

    return createSuccessResponse({ users });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return createErrorResponse(error.message || 'Error al cargar usuarios admin', 500);
  }
}

/**
 * POST - Crea un nuevo usuario admin
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    // Verificar permisos
    const currentUser = await getAdminUser(auth.userId);

    if (!currentUser || !hasAdminPermission(currentUser, 'create_admin_users')) {
      return createErrorResponse('No tienes permiso para crear usuarios admin', 403);
    }

    const body = await request.json();
    const { email, password, name, role, customPermissions } = body;

    if (!email || !password || !name || !role) {
      return createErrorResponse('Faltan campos requeridos', 400);
    }

    // Validar rol
    if (!['super_admin', 'admin', 'moderator', 'viewer'].includes(role)) {
      return createErrorResponse('Rol inválido', 400);
    }

    // Solo super_admin puede crear otros super_admin
    if (role === 'super_admin' && !hasAdminPermission(currentUser, 'super_admin')) {
      return createErrorResponse('Solo un Super Admin puede crear otros Super Admins', 403);
    }

    const newUser = await createAdminUser(
      {
        email,
        password,
        name,
        role,
        customPermissions,
      },
      auth.userId
    );

    return createSuccessResponse({ user: newUser }, 201);
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return createErrorResponse(error.message || 'Error al crear usuario admin', 500);
  }
}


