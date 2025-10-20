import { lockPeriod } from '@/app/sickness/periodo/actions';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const Schema = z.object({
  periodId: z.string().uuid(),
  contribution_disabled: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Datos inválidos' }, { status: 400 });
  }

  const result = await lockPeriod(parsed.data.periodId, parsed.data.contribution_disabled);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
