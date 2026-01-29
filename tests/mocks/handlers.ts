import { http, HttpResponse } from 'msw';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/v1';

// Mock data
const mockUser = {
  id: 1,
  operator_number: '1234',
  first_name: 'Test',
  last_name: 'User',
  role: 'mitarbeiter',
  is_active: true,
};

const mockRestaurant = {
  id: 1,
  name: 'Test Restaurant',
  address: 'Teststraße 1',
  phone: '+49 123 456789',
  email: 'test@restaurant.de',
};

const mockTables = [
  {
    id: 1,
    restaurant_id: 1,
    number: 'T1',
    capacity: 4,
    shape: 'rectangle',
    position_x: 100,
    position_y: 100,
    width: 120,
    height: 80,
    is_active: true,
  },
  {
    id: 2,
    restaurant_id: 1,
    number: 'T2',
    capacity: 2,
    shape: 'circle',
    position_x: 250,
    position_y: 100,
    width: 80,
    height: 80,
    is_active: true,
  },
];

const mockReservations = [
  {
    id: 1,
    restaurant_id: 1,
    table_id: 1,
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    party_size: 4,
    status: 'confirmed',
    guest_name: 'Max Mustermann',
  },
];

const mockOrders = [
  {
    id: 1,
    restaurant_id: 1,
    table_id: 1,
    status: 'open',
    party_size: 4,
    subtotal: 50.0,
    total: 50.0,
    payment_status: 'unpaid',
  },
];

export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as { operator_number: string; pin: string };
    
    if (body.operator_number === '1234' && body.pin === '123456') {
      return HttpResponse.json({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        token_type: 'bearer',
        expires_in: 3600,
      });
    }
    
    return new HttpResponse(
      JSON.stringify({ detail: 'Invalid operator number or PIN' }),
      { status: 401 }
    );
  }),
  
  http.get(`${API_URL}/auth/me`, () => {
    return HttpResponse.json(mockUser);
  }),
  
  http.post(`${API_URL}/auth/refresh`, () => {
    return HttpResponse.json({
      access_token: 'new_mock_access_token',
      refresh_token: 'new_mock_refresh_token',
      token_type: 'bearer',
      expires_in: 3600,
    });
  }),
  
  // Restaurant endpoints
  http.get(`${API_URL}/restaurants`, () => {
    return HttpResponse.json([mockRestaurant]);
  }),
  
  http.get(`${API_URL}/restaurants/:id`, () => {
    return HttpResponse.json(mockRestaurant);
  }),
  
  // Table endpoints
  http.get(`${API_URL}/restaurants/:restaurantId/tables`, () => {
    return HttpResponse.json(mockTables);
  }),
  
  http.patch(`${API_URL}/restaurants/:restaurantId/tables/:tableId`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...mockTables[0], ...body });
  }),
  
  // Reservation endpoints
  http.get(`${API_URL}/restaurants/:restaurantId/reservations`, () => {
    return HttpResponse.json(mockReservations);
  }),
  
  http.post(`${API_URL}/restaurants/:restaurantId/reservations`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      { id: 2, restaurant_id: 1, ...body },
      { status: 201 }
    );
  }),
  
  http.patch(`${API_URL}/restaurants/:restaurantId/reservations/:id`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...mockReservations[0], ...body });
  }),
  
  http.delete(`${API_URL}/restaurants/:restaurantId/reservations/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
  
  // Order endpoints
  http.get(`${API_URL}/restaurants/:restaurantId/orders`, () => {
    return HttpResponse.json(mockOrders);
  }),
  
  http.post(`${API_URL}/restaurants/:restaurantId/orders`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      { id: 2, restaurant_id: 1, status: 'open', ...body },
      { status: 201 }
    );
  }),
  
  // Areas endpoints
  http.get(`${API_URL}/restaurants/:restaurantId/areas`, () => {
    return HttpResponse.json([
      { id: 1, restaurant_id: 1, name: 'Innenbereich' },
      { id: 2, restaurant_id: 1, name: 'Terrasse' },
    ]);
  }),
  
  // Obstacles endpoints
  http.get(`${API_URL}/restaurants/:restaurantId/obstacles`, () => {
    return HttpResponse.json([]);
  }),
  
  // Blocks endpoints
  http.get(`${API_URL}/restaurants/:restaurantId/blocks`, () => {
    return HttpResponse.json([]);
  }),
  
  http.get(`${API_URL}/restaurants/:restaurantId/block-assignments`, () => {
    return HttpResponse.json([]);
  }),
  
  // User settings
  http.get(`${API_URL}/user-settings`, () => {
    return HttpResponse.json({ settings: {} });
  }),
  
  http.patch(`${API_URL}/user-settings`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ settings: body });
  }),
  
  // License
  http.get(`${API_URL}/license`, () => {
    return HttpResponse.json({
      valid: true,
      features: ['reservations', 'orders', 'tables'],
    });
  }),
];
