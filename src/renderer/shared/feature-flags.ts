// Renderer-side feature flags. Vite reads VITE_* values from .env at build time
// and inlines them as static strings. The main process reads its own copy from
// src/main/config.ts via the build-env pipeline — both must agree.
//
// Defaults to true so dev environments without an .env file behave as today.

const parseBool = (v: string | undefined): boolean => {
  if (v === undefined || v === '') return true;
  return /^(true|1|yes|on)$/i.test(v);
};

export const ALLOW_SCREENSHOTS = parseBool(
  import.meta.env.VITE_ALLOW_SCREENSHOTS as string | undefined
);
