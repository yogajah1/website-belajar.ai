import { NextRequest, NextResponse } from 'next/server';
import { getProviderStatuses } from '@/lib/ai/router';
import { geminiProvider } from '@/lib/ai/gemini';
import { groqProvider } from '@/lib/ai/groq';
import { cerebrasProvider } from '@/lib/ai/cerebras';
import { openrouterProvider } from '@/lib/ai/openrouter';
import { verifyAuthToken } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuthToken(req.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providerMap = {
      gemini: geminiProvider,
      groq: groqProvider,
      cerebras: cerebrasProvider,
      openrouter: openrouterProvider,
    };

    const statuses = getProviderStatuses();
    const testResults: Record<string, any> = {};

    for (const st of statuses) {
      const p = (providerMap as any)[st.name];
      if (!p || !p.isConfigured()) {
        testResults[st.name] = {
          configured: false,
          status: 'unconfigured',
          message: 'API Key belum diisi di environment variables',
          latencyMs: 0,
        };
        continue;
      }

      if (st.inCooldown) {
        testResults[st.name] = {
          configured: true,
          status: 'cooldown',
          message: `Sedang cooldown (${st.cooldownRemainingSeconds} detik tersisa)`,
          latencyMs: 0,
        };
        continue;
      }

      const start = Date.now();
      try {
        await p.call({
          prompt: 'Ketik "OK"',
          maxTokens: 5,
        });
        const latency = Date.now() - start;
        testResults[st.name] = {
          configured: true,
          status: 'healthy',
          message: 'Koneksi Berhasil',
          latencyMs: latency,
        };
      } catch (err: any) {
        testResults[st.name] = {
          configured: true,
          status: 'error',
          message: err.message || 'Koneksi gagal',
          latencyMs: Date.now() - start,
        };
      }
    }

    return NextResponse.json({
      success: true,
      statuses,
      testResults,
      testedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal mengetes koneksi AI' },
      { status: 500 }
    );
  }
}
