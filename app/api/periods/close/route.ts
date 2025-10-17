import { closePeriod } from '@/app/sickness/periodo/actions';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const Schema = z.object({ periodId: z.string().uuid(), notes: z.string().optional() });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Datos inválidos' }, { status: 400 });
  }

  const result = await closePeriod(parsed.data.periodId, parsed.data.notes);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
