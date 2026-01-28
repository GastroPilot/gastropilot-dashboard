'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { restaurantsApi, RestaurantCreate } from '@/lib/api/restaurants';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function CreateRestaurantPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RestaurantCreate>({
    name: '',
    address: '',
    phone: '',
    email: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.name.trim().length === 0) {
      setError('Restaurantname ist erforderlich');
      return;
    }

    setLoading(true);

    try {
      // Bereite Daten vor: leere Strings werden zu null
      const dataToSend: RestaurantCreate = {
        name: formData.name.trim(),
        address: formData.address?.trim() || null,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        description: formData.description?.trim() || null,
      };

      await restaurantsApi.create(dataToSend);
      router.push('/dashboard');
    } catch (err) {
      console.error('Fehler beim Erstellen des Restaurants:', err);
      if (err instanceof ApiError) {
        setError(err.message || 'Fehler beim Erstellen des Restaurants');
      } else {
        setError('Ein Fehler ist aufgetreten');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Neues Restaurant anlegen</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Restaurantname <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Mein Restaurant"
                required
                minLength={1}
                maxLength={200}
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium mb-1">
                Adresse
              </label>
              <Input
                id="address"
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value || null })}
                placeholder="Musterstraße 123, 12345 Musterstadt"
                maxLength={500}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">
                Telefonnummer
              </label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value || null })}
                placeholder="+49 123 456789"
                maxLength={50}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                E-Mail
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
                placeholder="info@restaurant.de"
                maxLength={255}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Beschreibung
              </label>
              <textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                placeholder="Beschreibung des Restaurants..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Wird erstellt...' : 'Restaurant anlegen'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
                Abbrechen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
