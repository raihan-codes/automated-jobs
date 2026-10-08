import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDoc, setDoc, doc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'user_raihan_molla';

    let settings = {
      userId,
      autoMatchOnIngest: true,
      notificationThreshold: 85,
      emailAlerts: false,
      autoTailorResume: true,
      remotePreference: 'ANY',
      atsAutoSync: true,
      theme: 'dark',
      syncIntervalMinutes: 30,
      updatedAt: new Date().toISOString()
    };

    if (db) {
      try {
        const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          settings = { ...settings, ...snap.data() };
        }
      } catch (e) {
        console.warn('[Settings API] Firestore read fallback:', e);
      }
    }

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch settings'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'user_raihan_molla';
    const body = await request.json();

    const updatedSettings = {
      userId,
      ...body,
      updatedAt: new Date().toISOString()
    };

    if (db) {
      try {
        const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
        await setDoc(settingsRef, updatedSettings, { merge: true });
      } catch (e) {
        console.warn('[Settings API] Firestore save fallback:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: updatedSettings
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to save settings'
    }, { status: 500 });
  }
}
