'use client';

import { useEffect, useState, useCallback } from 'react';
import { restaurantsApi, Restaurant } from '@/lib/api/restaurants';
import { vouchersApi, Voucher, VoucherCreate, VoucherUpdate } from '@/lib/api/vouchers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Plus, Edit, Trash2, Ticket, X, Save, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { confirmAction } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function VouchersPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<
    { id: string; message: string; variant?: 'info' | 'error' | 'success' }[]
  >([]);

  // Form States
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'fixed' | 'percentage'>('fixed');
  const [value, setValue] = useState<number>(0);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [minOrderValue, setMinOrderValue] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);

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

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const restaurantsData = await restaurantsApi.list();

      if (restaurantsData.length === 0) {
        addToast('Kein Restaurant gefunden', 'error');
        return;
      }

      const selectedRestaurant = restaurantsData[0];
      setRestaurant(selectedRestaurant);

      const vouchersData = await vouchersApi.list(selectedRestaurant.id, true);
      setVouchers(vouchersData);
    } catch (err) {
      console.error('Error loading vouchers:', err);
      addToast('Fehler beim Laden der Gutscheine', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setCode('');
    setName('');
    setDescription('');
    setType('fixed');
    setValue(0);
    setValidFrom('');
    setValidUntil('');
    setMaxUses(null);
    setMinOrderValue(null);
    setIsActive(true);
    setEditingVoucher(null);
    setError('');
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (voucher: Voucher) => {
    setCode(voucher.code);
    setName(voucher.name || '');
    setDescription(voucher.description || '');
    setType(voucher.type);
    setValue(voucher.value);
    setValidFrom(voucher.valid_from ? voucher.valid_from : '');
    setValidUntil(voucher.valid_until ? voucher.valid_until : '');
    setMaxUses(voucher.max_uses);
    setMinOrderValue(voucher.min_order_value);
    setIsActive(voucher.is_active);
    setEditingVoucher(voucher);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!restaurant) return;

    if (!code.trim()) {
      setError('Gutschein-Code ist erforderlich');
      return;
    }

    if (value <= 0) {
      setError('Wert muss größer als 0 sein');
      return;
    }

    if (type === 'percentage' && value > 100) {
      setError('Prozentwert darf nicht größer als 100 sein');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editingVoucher) {
        const updateData: VoucherUpdate = {
          name: name || null,
          description: description || null,
          type,
          value,
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          max_uses: maxUses || null,
          min_order_value: minOrderValue || null,
          is_active: isActive,
        };
        await vouchersApi.update(restaurant.id, editingVoucher.id, updateData);
        addToast('Gutschein aktualisiert', 'success');
      } else {
        const createData: VoucherCreate = {
          restaurant_id: restaurant.id,
          code: code.toUpperCase().trim(),
          name: name || null,
          description: description || null,
          type,
          value,
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          max_uses: maxUses || null,
          min_order_value: minOrderValue || null,
          is_active: isActive,
        };
        await vouchersApi.create(restaurant.id, createData);
        addToast('Gutschein erstellt', 'success');
      }

      setDialogOpen(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Speichern');
      addToast(err?.message || 'Fehler beim Speichern', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (voucher: Voucher) => {
    if (!restaurant) return;

    const confirmed = confirmAction(
      `Möchten Sie den Gutschein "${voucher.code}" wirklich löschen?`
    );

    if (!confirmed) return;

    try {
      await vouchersApi.delete(restaurant.id, voucher.id);
      addToast('Gutschein gelöscht', 'success');
      await loadData();
    } catch (err: any) {
      addToast(err?.message || 'Fehler beim Löschen', 'error');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('Code kopiert', 'success');
  };

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (!restaurant) {
    return (
      <div className="h-full flex flex-col bg-gray-900 text-gray-100 items-center justify-center">
        <p className="text-gray-400">Kein Restaurant gefunden</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100 overflow-hidden">
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] space-y-3">
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

      {/* Header */}
      <div className="shrink-0 border-b border-gray-700 bg-gray-800 shadow-sm">
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Gutschein-Verwaltung</h1>
                <p className="text-xs md:text-sm text-gray-400 mt-0.5">{restaurant.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1.5 md:pt-2">
              <Button
                size="sm"
                className="bg-blue-600 text-white shadow-none hover:bg-blue-600 hover:shadow-[0_12px_32px_rgba(37,99,235,0.35)]"
                onClick={openCreateDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                Neuer Gutschein
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {vouchers.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Noch keine Gutscheine vorhanden
              </h2>
              <p className="text-gray-400 mb-4">Erstellen Sie Ihren ersten Gutschein</p>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={openCreateDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ersten Gutschein erstellen
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className={`bg-gray-800 border rounded-lg p-4 transition-colors ${
                    voucher.is_active
                      ? 'border-gray-700 hover:border-orange-500'
                      : 'border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-bold text-white font-mono">
                          {voucher.code}
                        </code>
                        <button
                          onClick={() => copyCode(voucher.code)}
                          className="text-gray-400 hover:text-orange-400 transition-colors"
                          title="Code kopieren"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      {voucher.name && (
                        <p className="text-sm font-medium text-gray-300 mt-1">{voucher.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {voucher.is_active ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {voucher.description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{voucher.description}</p>
                  )}

                  <div className="space-y-1 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Typ:</span>
                      <span className="font-medium text-white">
                        {voucher.type === 'fixed'
                          ? `${voucher.value.toFixed(2)} €`
                          : `${voucher.value}%`}
                      </span>
                    </div>
                    {voucher.valid_from && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Gültig ab:</span>
                        <span className="text-gray-300">
                          {new Date(voucher.valid_from).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    )}
                    {voucher.valid_until && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Gültig bis:</span>
                        <span className="text-gray-300">
                          {new Date(voucher.valid_until).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    )}
                    {voucher.max_uses && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Nutzungen:</span>
                        <span className="text-gray-300">
                          {voucher.used_count} / {voucher.max_uses}
                        </span>
                      </div>
                    )}
                    {voucher.min_order_value && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Mindestbestellwert:</span>
                        <span className="text-gray-300">
                          {voucher.min_order_value.toFixed(2)} €
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(voucher)}
                      className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-700"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Bearbeiten
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(voucher)}
                      className="border-red-600 text-red-400 hover:bg-red-900/20 hover:border-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700 text-gray-100">
          <DialogHeader>
            <DialogTitle>{editingVoucher ? 'Gutschein bearbeiten' : 'Neuer Gutschein'}</DialogTitle>
            <DialogDescription>
              {editingVoucher
                ? 'Bearbeiten Sie die Gutschein-Details'
                : 'Erstellen Sie einen neuen Gutschein für Ihr Restaurant'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-500 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Gutschein-Code *
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="z.B. WELCOME2024"
                  disabled={!!editingVoucher}
                  className="font-mono bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                {editingVoucher && (
                  <p className="text-xs text-gray-500 mt-1">Code kann nicht geändert werden</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name (optional)
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Willkommens-Gutschein"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Beschreibung (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibung des Gutscheins..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-400"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Typ *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'fixed' | 'percentage')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                >
                  <option value="fixed">Fester Betrag (€)</option>
                  <option value="percentage">Prozentual (%)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Wert *</label>
                <Input
                  type="number"
                  step={type === 'fixed' ? '0.01' : '1'}
                  min="0"
                  max={type === 'percentage' ? '100' : undefined}
                  value={value}
                  onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                  placeholder={type === 'fixed' ? '10.00' : '10'}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {type === 'fixed' ? 'Betrag in EUR' : 'Prozent (0-100)'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Gültig ab (optional)
                </label>
                <Input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Gültig bis (optional)
                </label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Max. Nutzungen (optional)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={maxUses || ''}
                  onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Unbegrenzt"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Mindestbestellwert (optional)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={minOrderValue || ''}
                  onChange={(e) =>
                    setMinOrderValue(e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="Kein Minimum"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-300">
                Gutschein ist aktiv
              </label>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-700 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
              className="border-gray-600 text-gray-200 hover:bg-gray-700"
            >
              <X className="w-4 h-4 mr-1" />
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4 mr-1" />
              {loading ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
