import type { ComponentType } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Hourglass,
  Camera,
  Lock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  ListChecks,
  ClipboardCheck,
  KeyRound,
  Users,
  CircleDot,
} from './icons';

interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

// The whitelist of icons a reviewer can pick from when editing rules. Keep this
// in sync with the same map in the Electron app — together they form the
// contract between server-stored rule.icon strings and rendered components.
export const ICON_BY_NAME: Record<string, ComponentType<IconProps>> = {
  ShieldAlert,
  ShieldCheck,
  Hourglass,
  Camera,
  Lock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  ListChecks,
  ClipboardCheck,
  KeyRound,
  Users,
  CircleDot,
};

export const ICON_NAMES = Object.keys(ICON_BY_NAME);

export const renderIconByName = (name: string, props: IconProps = {}) => {
  const Icon = ICON_BY_NAME[name] ?? CircleDot;
  return <Icon {...props} />;
};
