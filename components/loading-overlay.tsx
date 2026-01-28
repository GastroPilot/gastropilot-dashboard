'use client';

type LoadingOverlayProps = {
  message?: string;
  variant?: 'dark' | 'light';
};

export function LoadingOverlay({
  message = 'Wird geladen...',
  variant = 'dark',
}: LoadingOverlayProps) {
  const isDark = variant === 'dark';
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}
      style={{ zIndex: 200 }}
    >
      <div className="flex items-center gap-3 text-lg font-semibold">
        <span
          className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
        <span>{message}</span>
      </div>
    </div>
  );
}
