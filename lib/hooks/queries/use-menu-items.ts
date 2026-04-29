import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  menuApi,
  type MenuCategory,
  type MenuItem,
  type MenuItemCreate,
  type MenuItemUpdate,
} from '@/lib/api/menu';

interface MenuItemListParams {
  category_id?: string;
  available_only?: boolean;
}

export const menuKeys = {
  all: ['menu'] as const,
  items: () => [...menuKeys.all, 'items'] as const,
  itemList: (restaurantId: string, params?: MenuItemListParams) =>
    [...menuKeys.items(), restaurantId, params ?? {}] as const,
  itemDetail: (restaurantId: string, itemId: string) =>
    [...menuKeys.items(), restaurantId, 'detail', itemId] as const,
  categories: () => [...menuKeys.all, 'categories'] as const,
  categoryList: (restaurantId: string) => [...menuKeys.categories(), restaurantId] as const,
};

/**
 * Liste aller Menu-Items eines Restaurants.
 * Tenant-Kontext wird serverseitig über das JWT erzwungen.
 */
export function useMenuItems(restaurantId: string | undefined, params?: MenuItemListParams) {
  return useQuery<MenuItem[]>({
    queryKey: menuKeys.itemList(restaurantId ?? '', params),
    queryFn: () => menuApi.listItems(restaurantId!, params),
    enabled: !!restaurantId,
  });
}

/**
 * Einzelnes Menu-Item.
 */
export function useMenuItem(restaurantId: string | undefined, itemId: string | undefined) {
  return useQuery<MenuItem>({
    queryKey: menuKeys.itemDetail(restaurantId ?? '', itemId ?? ''),
    queryFn: () => menuApi.getItem(restaurantId!, itemId!),
    enabled: !!restaurantId && !!itemId,
  });
}

/**
 * Liste aller Kategorien (für Dropdown im Editor).
 */
export function useMenuCategories(restaurantId: string | undefined) {
  return useQuery<MenuCategory[]>({
    queryKey: menuKeys.categoryList(restaurantId ?? ''),
    queryFn: () => menuApi.listCategories(restaurantId!),
    enabled: !!restaurantId,
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ restaurantId, data }: { restaurantId: string; data: MenuItemCreate }) =>
      menuApi.createItem(restaurantId, data),
    onSuccess: (_data, { restaurantId }) => {
      queryClient.invalidateQueries({
        queryKey: menuKeys.items(),
      });
      queryClient.invalidateQueries({
        queryKey: menuKeys.itemList(restaurantId),
      });
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      itemId,
      data,
    }: {
      restaurantId: string;
      itemId: string;
      data: MenuItemUpdate;
    }) => menuApi.updateItem(restaurantId, itemId, data),
    onSuccess: (_data, { restaurantId, itemId }) => {
      queryClient.invalidateQueries({
        queryKey: menuKeys.items(),
      });
      queryClient.invalidateQueries({
        queryKey: menuKeys.itemDetail(restaurantId, itemId),
      });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ restaurantId, itemId }: { restaurantId: string; itemId: string }) =>
      menuApi.deleteItem(restaurantId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: menuKeys.items(),
      });
    },
  });
}
