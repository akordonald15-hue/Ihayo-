import { proxyVoice } from '@/lib/voice/proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
type Context = { params: Promise<{ action: string }> };
export async function GET(request: Request, context: Context) {
  return proxyVoice(request, (await context.params).action);
}
export async function POST(request: Request, context: Context) {
  return proxyVoice(request, (await context.params).action);
}
