/**
 * API Client for KDS device management.
 */
import { api } from "./client";

export interface Device {
  id: string;
  tenant_id: string;
  name: string;
  station: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceWithToken extends Device {
  device_token: string;
}

export interface DeviceCreate {
  name: string;
  station?: string;
}

export interface DeviceRegenerateResponse {
  id: string;
  device_token: string;
  message: string;
}

class DevicesApi {
  async list(): Promise<Device[]> {
    return api.get<Device[]>("/devices/");
  }

  async create(data: DeviceCreate): Promise<DeviceWithToken> {
    return api.post<DeviceWithToken>("/devices/", data);
  }

  async delete(deviceId: string): Promise<void> {
    return api.delete(`/devices/${deviceId}`);
  }

  async regenerateToken(deviceId: string): Promise<DeviceRegenerateResponse> {
    return api.post<DeviceRegenerateResponse>(
      `/devices/${deviceId}/regenerate-token`
    );
  }
}

export const devicesApi = new DevicesApi();
