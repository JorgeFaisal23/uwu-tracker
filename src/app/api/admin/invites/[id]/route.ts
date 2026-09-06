import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { requireAdmin } from '@/lib/session';
import { errorResponse } from '@/lib/api';

/** Revoca una invitación pendiente. Las ya usadas se conservan como registro. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();

    const { id } = await params;
    await StorageService.revokeInviteToken(id);

    return NextResponse.json({ success: true, message: 'Invitación revocada.' });
  } catch (err) {
    return errorResponse(err);
  }
}
