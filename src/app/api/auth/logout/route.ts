import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session';
import { errorResponse } from '@/lib/api';

export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
