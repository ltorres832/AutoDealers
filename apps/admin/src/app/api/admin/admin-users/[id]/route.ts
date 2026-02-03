import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { 
  getAdminUser, 
  updateAdminUser, 
  deleteAdminUser
} from '@autodealers/core/admin-users-management';
import { hasPermission as hasAdminPermission } from '@autodealers/core/admin-permissions';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET - Obtiene un usuario admin específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const currentUser = await getAdminUser(auth.userId);
    if (!currentUser || !hasAdminPermission(currentUser, 'view_admin_users')) {
      return createErrorResponse('No tienes permiso para ver usuarios admin', 403);
    }

    const { id } = await params;
    const user = await getAdminUser(id);

    if (!user) {
      return createErrorResponse('Usuario no encontrado', 404);
    }

    return createSuccessResponse({ user });
  } catch (error: any) {
    console.error('Error fetching admin user:', error);
    return createErrorResponse(error.message || 'Error al cargar usuario', 500);
  }
}

/**
 * PUT - Actualiza un usuario admin
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const currentUser = await getAdminUser(auth.userId);
    if (!currentUser || !hasAdminPermission(currentUser, 'edit_admin_users')) {
      return createErrorResponse('No tienes permiso para editar usuarios admin', 403);
    }

    const { id } = await params;
    const body = await request.json();
    const { name, role, customPermissions, isActive } = body;

    // Solo super_admin puede promover a super_admin
    if (role === 'super_admin' && !hasAdminPermission(currentUser, 'super_admin')) {
      return createErrorResponse('Solo un Super Admin puede promover a Super Admin', 403);
    }

    // No se puede desactivar a sí mismo
    if (id === auth.userId && isActive === false) {
      return createErrorResponse('No puedes desactivarte a ti mismo', 400);
    }

    await updateAdminUser(id, {
      name,
      role,
      customPermissions,
      isActive,
    });

    const updatedUser = await getAdminUser(id);

    return createSuccessResponse({ user: updatedUser });
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    return createErrorResponse(error.message || 'Error al actualizar usuario', 500);
  }
}

/**
 * DELETE - Elimina un usuario admin
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const currentUser = await getAdminUser(auth.userId);
    if (!currentUser || !hasAdminPermission(currentUser, 'delete_admin_users')) {
      return createErrorResponse('No tienes permiso para eliminar usuarios admin', 403);
    }

    const { id } = await params;
    // No se puede eliminar a sí mismo
    if (id === auth.userId) {
      return createErrorResponse('No puedes eliminarte a ti mismo', 400);
    }

    await deleteAdminUser(id);

    return createSuccessResponse({ message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error deleting admin user:', error);
    return createErrorResponse(error.message || 'Error al eliminar usuario', 500);
  }
}


