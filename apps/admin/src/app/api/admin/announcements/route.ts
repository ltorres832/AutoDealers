export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getAllAnnouncements,
  createGlobalAnnouncement,
  updateGlobalAnnouncement,
  deleteGlobalAnnouncement,
} from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const announcements = await getAllAnnouncements();
    return NextResponse.json({ announcements });
  } catch (error: any) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener anuncios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      message,
      type,
      priority,
      targetDashboards,
      targetRoles,
      targetTenants,
      startDate,
      endDate,
      isActive,
      showDismissButton,
      actionUrl,
      actionText,
      sendNotifications,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Título y mensaje son requeridos' },
        { status: 400 }
      );
    }

    const announcement = await createGlobalAnnouncement({
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      targetDashboards: targetDashboards || ['admin', 'dealer', 'seller', 'public'],
      targetRoles,
      targetTenants,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      isActive: isActive !== false,
      showDismissButton: showDismissButton !== false,
      actionUrl,
      actionText,
      createdBy: auth.userId,
    }, sendNotifications !== false);

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear anuncio' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del anuncio es requerido' },
        { status: 400 }
      );
    }

    const updateData: any = { ...updates };
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    const announcement = await updateGlobalAnnouncement(id, updateData);
    return NextResponse.json({ announcement });
  } catch (error: any) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar anuncio' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID del anuncio es requerido' },
        { status: 400 }
      );
    }

    await deleteGlobalAnnouncement(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar anuncio' },
      { status: 500 }
    );
  }
}


