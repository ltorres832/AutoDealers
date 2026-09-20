import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  HIGHLIGHT_PATHS,
  PLATFORM_ACTIVITY_TIME_ZONE,
  PLATFORM_APP_LABELS,
  PLATFORM_APPS,
  addDaysToDateKey,
  aggregatePlatformPaths,
  dateKeyInTimeZone,
  filterPlatformDays,
  getContactInquirySummary,
  isPlatformApp,
  labelPlatformPath,
  listPlatformActivityDays,
  startOfMonthKey,
  sumPlatformDays,
  sumPlatformDaysByApp,
  type PlatformApp,
} from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestedApp = request.nextUrl.searchParams.get('app');
    const app: PlatformApp | 'all' = isPlatformApp(requestedApp) ? requestedApp : 'all';

    const today = new Date();
    const todayKey = dateKeyInTimeZone(today);
    const startKey = dateKeyInTimeZone(addDaysToDateKey(today, -89));
    const weekStartKey = dateKeyInTimeZone(addDaysToDateKey(today, -6));
    const monthStartKey = startOfMonthKey(todayKey);

    const allDays = await listPlatformActivityDays(startKey, todayKey);
    const days = filterPlatformDays(allDays, app);
    const todayRows = days.filter((row) => row.date === todayKey);
    const weekRows = days.filter((row) => row.date >= weekStartKey && row.date <= todayKey);
    const monthRows = days.filter((row) => row.date >= monthStartKey && row.date <= todayKey);
    const series = days.slice(-30);
    const pathSource = days.slice(-30);

    const pathTotals = aggregatePlatformPaths(pathSource, 60);
    const highlightPaths = HIGHLIGHT_PATHS.filter((item) => app === 'all' || item.app === app).map((item) => {
      const match = pathTotals.find((row) => row.app === item.app && row.path === item.path);
      return {
        app: item.app,
        path: item.path,
        label: labelPlatformPath(item.path),
        pageViews: match?.pageViews || 0,
      };
    });

    const contacts = await getContactInquirySummary();

    return NextResponse.json({
      timeZone: PLATFORM_ACTIVITY_TIME_ZONE,
      app,
      apps: PLATFORM_APPS.map((id) => ({ id, label: PLATFORM_APP_LABELS[id] })),
      today: sumPlatformDays(todayRows),
      week: sumPlatformDays(weekRows),
      month: sumPlatformDays(monthRows),
      byApp: {
        today: sumPlatformDaysByApp(todayRows),
        week: sumPlatformDaysByApp(weekRows),
        month: sumPlatformDaysByApp(monthRows),
      },
      topPaths: pathTotals,
      highlightPaths,
      contacts,
      series: series.map((row) => ({
        date: row.date,
        uniqueVisitors: row.uniqueVisitors,
        pageViews: row.pageViews,
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /api/admin/public-analytics', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
