import { useRouteError } from 'react-router-dom';
import { ErrorState } from '@/components/ui/ErrorState';

/**
 * Last-resort boundary for render errors and failed lazy-route chunk loads (for example after a
 * deploy replaced the old bundles). Guarantees the user never lands on a blank screen.
 */
export function RouteErrorPage() {
  const error = useRouteError();

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-6">
      <ErrorState
        title="This page failed to load"
        error={error}
        message="An unexpected error occurred. Reloading usually fixes it."
        onRetry={() => {
          window.location.reload();
        }}
        className="w-full max-w-lg"
      />
    </div>
  );
}
