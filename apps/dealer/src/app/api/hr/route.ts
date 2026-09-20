import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  listEmployees,
  upsertEmployeeFromUser,
  updateEmployee,
  recordAttendance,
  listAttendance,
  ensureOnboardingChecklist,
  updateOnboardingItem,
  listLeaveRequests,
  createLeaveRequest,
  reviewLeaveRequest,
  getLeaveBalance,
} from '@autodealers/crm';
import { getFirestore } from '@autodealers/shared';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'employees';

    if (view === 'attendance') {
      const userId = url.searchParams.get('userId') || undefined;
      const records = await listAttendance(auth.tenantId, { userId, limit: 200 });
      return NextResponse.json({ records });
    }
    if (view === 'leaves') {
      const requests = await listLeaveRequests(auth.tenantId, { limit: 100 });
      return NextResponse.json({ requests });
    }
    if (view === 'leave_balance') {
      const userId = url.searchParams.get('userId');
      if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
      const year = Number(url.searchParams.get('year') || new Date().getFullYear());
      const balance = await getLeaveBalance(auth.tenantId, userId, year);
      return NextResponse.json({ balance });
    }
    if (view === 'onboarding') {
      const userId = url.searchParams.get('userId');
      if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
      const checklist = await ensureOnboardingChecklist(auth.tenantId, userId);
      return NextResponse.json({ checklist });
    }

    const employees = await listEmployees(auth.tenantId);
    return NextResponse.json({ employees });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const action = String(body.action || 'sync_user');

    if (action === 'sync_user') {
      const userId = String(body.userId || '');
      if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
      const userDoc = await getFirestore().collection('users').doc(userId).get();
      if (!userDoc.exists) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      const u = userDoc.data()!;
      const employee = await upsertEmployeeFromUser({
        tenantId: auth.tenantId,
        userId,
        displayName: u.name || u.displayName || u.email || userId,
        email: u.email,
        phone: u.phone,
        departmentTemplate: u.departmentTemplate,
      });
      return NextResponse.json({ employee }, { status: 201 });
    }

    if (action === 'attendance') {
      const record = await recordAttendance({
        tenantId: auth.tenantId,
        userId: String(body.userId),
        date: String(body.date || new Date().toISOString().slice(0, 10)),
        clockIn: body.clockIn,
        clockOut: body.clockOut,
        status: body.status || 'present',
        notes: body.notes,
        createdBy: auth.userId,
      });
      return NextResponse.json({ record }, { status: 201 });
    }

    if (action === 'create_leave') {
      const userId = String(body.userId || body.sellerId || '');
      if (!userId) return NextResponse.json({ error: 'Empleado requerido' }, { status: 400 });
      if (!body.startDate || !body.endDate) {
        return NextResponse.json({ error: 'Fechas de inicio y fin requeridas' }, { status: 400 });
      }
      let sellerName = body.sellerName || body.employeeName;
      if (!sellerName) {
        const emp = (await listEmployees(auth.tenantId)).find(
          (e) => e.userId === userId || e.id === userId
        );
        sellerName = emp?.displayName || emp?.email || userId;
      }
      const leaveReq = await createLeaveRequest({
        tenantId: auth.tenantId,
        sellerId: userId,
        sellerName,
        startDate: String(body.startDate),
        endDate: String(body.endDate),
        reason: body.reason,
      });
      return NextResponse.json({ request: leaveReq }, { status: 201 });
    }

    if (action === 'review_leave') {
      const status = body.status === 'approved' || body.status === 'rejected' ? body.status : null;
      if (!status) {
        return NextResponse.json({ error: 'status debe ser approved o rejected' }, { status: 400 });
      }
      await reviewLeaveRequest(
        auth.tenantId,
        String(body.id),
        status,
        auth.userId,
        body.reviewerNote
      );
      return NextResponse.json({ ok: true });
    }

    if (action === 'onboarding_toggle') {
      const checklist = await updateOnboardingItem(
        auth.tenantId,
        String(body.userId),
        String(body.itemId),
        body.done === true
      );
      return NextResponse.json({ checklist });
    }

    if (action === 'update_employee') {
      await updateEmployee(auth.tenantId, String(body.employeeId), {
        jobTitle: body.jobTitle,
        hireDate: body.hireDate,
        status: body.status,
        emergencyContact: body.emergencyContact,
        notes: body.notes,
        departmentTemplate: body.departmentTemplate,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
