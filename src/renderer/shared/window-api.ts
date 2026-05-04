import type { WorkSightApi } from '../../preload';

declare global {
  interface Window {
    worksight: WorkSightApi;
  }
}

export const ws = (): WorkSightApi => {
  if (!window.worksight) {
    throw new Error('WorkSight preload bridge missing');
  }
  return window.worksight;
};
