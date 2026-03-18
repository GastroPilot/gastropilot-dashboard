"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reservationsApi, type CreateReservationRequest } from "@/lib/api/reservations";

export function useMyReservations() {
  return useQuery({
    queryKey: ["my-reservations"],
    queryFn: () => reservationsApi.getMyReservations(),
    staleTime: 30 * 1000,
  });
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: ["reservation", id],
    queryFn: () => reservationsApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useAvailability(slug: string, date: string, partySize: number) {
  return useQuery({
    queryKey: ["availability", slug, date, partySize],
    queryFn: () => reservationsApi.checkAvailability(slug, date, partySize),
    enabled: !!slug && !!date && partySize > 0,
    staleTime: 30 * 1000,
  });
}

export function useCreateReservation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReservationRequest) => reservationsApi.create(slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reservationId: string) => reservationsApi.cancel(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
    },
  });
}
