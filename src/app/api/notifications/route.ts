import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserNotificationsFromFirestore, saveNotificationToFirestore } from '@/lib/firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const headerUserId = request.headers.get('x-user-id');
  const paramUserId = searchParams.get('userId');
  const userId = paramUserId || headerUserId || 'user_raihan_molla';

  // 1. Fetch user notifications from Firestore
  let notifs: any[] = await getUserNotificationsFromFirestore(userId).catch(() => []);

  // 2. Fallback to memory for this specific userId
  if (notifs.length === 0) {
    notifs = db.notifications.filter(n => n.userId === userId);
  }

  return NextResponse.json({
    success: true,
    userId,
    notifications: notifs,
    unreadCount: notifs.filter(n => !n.isRead).length
  });
}

export async function POST(request: Request) {
  const headerUserId = request.headers.get('x-user-id');
  const { id, userId: bodyUserId } = await request.json();
  const userId = bodyUserId || headerUserId || 'user_raihan_molla';

  const notif = db.notifications.find(n => n.id === id && n.userId === userId);
  if (notif) {
    notif.isRead = true;
    await saveNotificationToFirestore(userId, notif).catch(() => {});
  }
  return NextResponse.json({ success: true, userId });
}
