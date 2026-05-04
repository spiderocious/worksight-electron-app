import { useState, type FormEvent } from 'react';
import { Button, Logo } from '@shared/ui';
import { ShieldCheck } from '@shared/ui/icons';
import { useToast } from '@shared/hooks/use-toast';
import { api } from '@shared/services/api-client';
import { ws } from '@shared/window-api';

interface ExchangeResponse {
  token: string;
  candidate: { id: string; name: string; email: string };
}

export const CodeEntryScreen = ({ onSignedIn }: { onSignedIn: () => void }) => {
  const { push } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api<ExchangeResponse>('/candidates/auth/exchange', {
        method: 'POST',
        body: { accessCode: code.trim().toUpperCase() },
        noAuth: true,
      });
      await ws().auth.setToken(data.token);
      onSignedIn();
    } catch (err) {
      push(err instanceof Error ? err.message : 'Could not sign in', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-brand-900 text-brand-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-700 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-brand-500 rounded-full blur-3xl opacity-50" />
        </div>
        <div className="relative">
          <Logo size={32} />
        </div>
        <div className="relative max-w-md">
          <p className="font-display text-3xl leading-tight tracking-tight text-brand-50">
            One short code,
            <br />
            <span className="text-brand-200 italic">that's all you need.</span>
          </p>
          <p className="mt-6 text-brand-200 text-sm leading-relaxed">
            Enter the access code your reviewer sent you. WorkSight will fetch your
            assignments and walk you through the rules before you start.
          </p>
        </div>
        <div className="relative text-xs text-brand-300/70 flex items-center gap-2">
          <ShieldCheck size={12} /> Local-only credential, never shared.
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-surface-subtle px-6">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-tight">Sign in</h1>
            <p className="text-sm text-ink-muted mt-2">
              Enter your 10-character access code.
            </p>
          </div>
          <div>
            <label htmlFor="code" className="block text-xs font-medium text-ink-muted mb-2">
              Access code
            </label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={10}
              autoComplete="off"
              autoFocus
              className="w-full text-center text-2xl tracking-[0.45em] font-mono uppercase bg-surface border border-line rounded-xl py-5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              placeholder="A B C 1 2 3 4 5 6 7"
            />
          </div>
          <Button type="submit" className="w-full" loading={loading} disabled={code.length !== 10}>
            Continue
          </Button>
          <p className="text-xs text-ink-soft text-center">
            Don't have a code? Ask your reviewer to share theirs with you.
          </p>
        </form>
      </div>
    </div>
  );
};
