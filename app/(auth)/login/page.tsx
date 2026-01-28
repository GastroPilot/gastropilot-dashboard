'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import { restaurantsApi } from '@/lib/api/restaurants';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  LogIn,
  Key,
  User,
  CreditCard,
  AlertCircle,
  Loader2,
  Shield,
  ArrowRight,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [operatorNumber, setOperatorNumber] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string>('GastroPilot');
  const [toasts, setToasts] = useState<
    { id: string; message: string; variant?: 'info' | 'error' | 'success' }[]
  >([]);

  useEffect(() => {
    const loadRestaurantName = async () => {
      try {
        const name = await restaurantsApi.getPublicName();
        setRestaurantName(name);
      } catch (err) {
        // Ignore errors - restaurant name is optional
        console.error('Fehler beim Laden des Restaurantnamens:', err);
      }
    };
    loadRestaurantName();
  }, []);

  const addToast = useCallback(
    (message: string, variant: 'info' | 'error' | 'success' = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const handleOperatorNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setOperatorNumber(value);
    setError(''); // Clear error when user types
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
    setPin(value);
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (operatorNumber.length !== 4) {
      const errorMsg = 'Bedienernummer muss 4 Ziffern lang sein';
      setError(errorMsg);
      addToast(errorMsg, 'error');
      return;
    }

    if (pin.length < 6 || pin.length > 8) {
      const errorMsg = 'PIN muss 6-8 Ziffern lang sein';
      setError(errorMsg);
      addToast(errorMsg, 'error');
      return;
    }

    setLoading(true);

    try {
      await authApi.login({ operator_number: operatorNumber, pin });

      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

      if (!token) {
        const errorMsg = 'Token konnte nicht gespeichert werden';
        setError(errorMsg);
        addToast(errorMsg, 'error');
        setLoading(false);
        return;
      }

      addToast('Erfolgreich angemeldet', 'success');
      // Small delay to show success toast
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 300);
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof ApiError) {
        const errorMsg = err.message || 'Ungültige Bedienernummer oder PIN';
        setError(errorMsg);
        addToast(errorMsg, 'error');
      } else {
        const errorMsg = 'Ein Fehler ist aufgetreten';
        setError(errorMsg);
        addToast(errorMsg, 'error');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[200] space-y-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`min-w-[260px] rounded-lg border px-4 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.35)] text-sm ${
                toast.variant === 'error'
                  ? 'bg-red-900/80 border-red-500 text-red-50'
                  : toast.variant === 'success'
                    ? 'bg-green-900/80 border-green-500 text-green-50'
                    : 'bg-slate-800/90 border-slate-600 text-slate-100'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-400 shadow-lg shadow-blue-500/25 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{restaurantName}</h1>
          <p className="text-gray-400 text-sm">Reservierungsmanagement</p>
        </div>

        <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm shadow-2xl">
          <CardHeader className="border-b border-gray-700">
            <CardTitle className="flex items-center gap-2 text-white text-xl">
              <LogIn className="w-5 h-5 text-blue-400" />
              Anmelden
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-900/30 border border-red-600/50 text-red-300 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Fehler</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="operatorNumber"
                  className="flex items-center gap-2 text-sm font-medium text-gray-300"
                >
                  <User className="w-4 h-4 text-blue-400" />
                  Bedienernummer (4 Ziffern)
                </label>
                <Input
                  id="operatorNumber"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  value={operatorNumber}
                  onChange={handleOperatorNumberChange}
                  placeholder="0000"
                  maxLength={4}
                  required
                  autoFocus
                  className="text-center text-2xl tracking-widest font-mono bg-gray-800/50 border-gray-600 text-white focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="pin"
                  className="flex items-center gap-2 text-sm font-medium text-gray-300"
                >
                  <Key className="w-4 h-4 text-blue-400" />
                  PIN (6-8 Ziffern)
                </label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{6,8}"
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="••••••"
                  maxLength={8}
                  required
                  className="text-center text-xl tracking-widest font-mono bg-gray-800/50 border-gray-600 text-white focus:border-blue-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2 touch-manipulation min-h-[48px] text-base font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Wird angemeldet...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Anmelden</span>
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <Link
                href="/login-nfc"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-600 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors touch-manipulation min-h-[44px]"
              >
                <CreditCard className="w-5 h-5" />
                <span>Mit NFC-Transponder anmelden</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Servecta • GastroPilot
          </p>
        </div>
      </div>
    </div>
  );
}
