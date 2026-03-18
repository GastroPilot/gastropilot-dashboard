import { api } from "./client";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string | null;
}

export const notificationsApi = {
  list: (page = 1, perPage = 20) =>
    api.get<Notification[]>(
      `/public/notifications?page=${page}&per_page=${perPage}`
    ),

  unreadCount: () =>
    api.get<{ unread_count: number }>("/public/notifications/unread-count"),

  markRead: (id: string) =>
    api.patch<{ id: string; is_read: boolean }>(
      `/public/notifications/${id}/read`
    ),

  markAllRead: () =>
    api.patch<{ message: string }>("/public/notifications/read-all"),
};
