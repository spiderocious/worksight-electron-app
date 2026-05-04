import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@shared/hooks/use-toast';
import { PageLoader } from '@shared/ui';
import { ws } from '@shared/window-api';
import { CodeEntryScreen } from '@features/auth/code-entry-screen';
import { DashboardScreen } from '@features/dashboard/dashboard-screen';
import { BriefScreen } from '@features/assignment/brief-screen';
import { RulesScreen } from '@features/session/rules-screen';
import { SessionScreen } from '@features/session/session-screen';
import { SubmittedScreen } from '@features/session/submitted-screen';
import { ScreenPermissionScreen } from '@features/session/screen-permission-screen';
import { CompletedDetailScreen } from '@features/assignment/completed-detail-screen';

type CompletedScore = { numericScore: number; feedback: string } | null;

type Route =
  | { name: 'loading' }
  | { name: 'sign-in' }
  | { name: 'dashboard' }
  | { name: 'brief'; instanceId: string }
  | { name: 'rules'; instanceId: string }
  | { name: 'screen-permission'; instanceId: string }
  | { name: 'session'; sessionId: string; instanceId?: string; recovered?: boolean }
  | { name: 'submitted' }
  | { name: 'completed'; instanceId: string; sessionId: string; score: CompletedScore };

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

const Inner = () => {
  const [route, setRoute] = useState<Route>({ name: 'loading' });

  useEffect(() => {
    let unsubRecovery: (() => void) | null = null;
    let unsubEnded: (() => void) | null = null;

    const bootstrap = async () => {
      const token = await ws().auth.getToken();
      if (!token) {
        setRoute({ name: 'sign-in' });
        return;
      }
      const state = await ws().session.requestState();
      if (state.inProgress && state.sessionId) {
        setRoute({ name: 'session', sessionId: state.sessionId, instanceId: state.instanceId });
      } else {
        setRoute({ name: 'dashboard' });
      }
    };
    void bootstrap();

    unsubRecovery = ws().session.onAbnormalRecovered((p) => {
      setRoute({ name: 'session', sessionId: p.sessionId, instanceId: p.instanceId, recovered: true });
    });
    unsubEnded = ws().session.onEnded(() => {
      setRoute({ name: 'submitted' });
    });

    return () => {
      unsubRecovery?.();
      unsubEnded?.();
    };
  }, []);

  switch (route.name) {
    case 'loading':
      return <PageLoader />;
    case 'sign-in':
      return <CodeEntryScreen onSignedIn={() => setRoute({ name: 'dashboard' })} />;
    case 'dashboard':
      return (
        <DashboardScreen
          onPickAssignment={(instanceId) => setRoute({ name: 'brief', instanceId })}
          onResumeSession={(sessionId) => setRoute({ name: 'session', sessionId })}
          onOpenCompleted={(instanceId, sessionId, score) =>
            setRoute({ name: 'completed', instanceId, sessionId, score })
          }
          onSignOut={() => setRoute({ name: 'sign-in' })}
        />
      );
    case 'brief':
      return (
        <BriefScreen
          instanceId={route.instanceId}
          onBack={() => setRoute({ name: 'dashboard' })}
          onContinue={(instanceId) => setRoute({ name: 'rules', instanceId })}
        />
      );
    case 'rules':
      return (
        <RulesScreen
          instanceId={route.instanceId}
          onCancel={() => setRoute({ name: 'brief', instanceId: route.instanceId })}
          onStarted={(sessionId) =>
            setRoute({ name: 'session', sessionId, instanceId: route.instanceId })
          }
          onNeedsScreenPermission={() =>
            setRoute({ name: 'screen-permission', instanceId: route.instanceId })
          }
        />
      );
    case 'screen-permission':
      return (
        <ScreenPermissionScreen
          onCancel={() => setRoute({ name: 'rules', instanceId: route.instanceId })}
          onGranted={() => setRoute({ name: 'rules', instanceId: route.instanceId })}
        />
      );
    case 'session':
      return (
        <SessionScreen
          sessionId={route.sessionId}
          initialInstanceId={route.instanceId}
          recovered={route.recovered}
          onEnded={() => setRoute({ name: 'submitted' })}
        />
      );
    case 'submitted':
      return <SubmittedScreen onContinue={() => setRoute({ name: 'dashboard' })} />;
    case 'completed':
      return (
        <CompletedDetailScreen
          instanceId={route.instanceId}
          sessionId={route.sessionId}
          score={route.score}
          onBack={() => setRoute({ name: 'dashboard' })}
        />
      );
  }
};

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <ToastProvider>
      <Inner />
    </ToastProvider>
  </QueryClientProvider>
);
