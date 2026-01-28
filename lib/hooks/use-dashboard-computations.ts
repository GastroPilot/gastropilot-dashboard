'use client';

import { useMemo, useCallback } from 'react';
import { parseISO, startOfDay, endOfDay, isSameDay, format } from 'date-fns';
import type { Reservation } from '@/lib/api/reservations';
import type { Block } from '@/lib/api/blocks';
import type { BlockAssignment } from '@/lib/api/block-assignments';
import type { Table } from '@/lib/api/tables';
import type { Order } from '@/lib/api/orders';

interface UseDashboardComputationsProps {
  reservations: Reservation[];
  blocks: Block[];
  blockAssignments: BlockAssignment[];
  tables: Table[];
  orders: Order[];
  selectedDate: Date;
  reservationToTempTableMap: Map<number, number>;
}

/**
 * Hook für alle berechneten Dashboard-Daten.
 * Nutzt useMemo für Caching und vermeidet wiederholte Berechnungen.
 */
export function useDashboardComputations({
  reservations,
  blocks,
  blockAssignments,
  tables,
  orders,
  selectedDate,
  reservationToTempTableMap,
}: UseDashboardComputationsProps) {
  // Cached date boundaries
  const dateBoundaries = useMemo(
    () => ({
      dayStart: startOfDay(selectedDate),
      dayEnd: endOfDay(selectedDate),
      isToday: isSameDay(selectedDate, new Date()),
      dateStr: format(selectedDate, 'yyyy-MM-dd'),
    }),
    [selectedDate]
  );

  // Block ID -> Block mapping für schnellen Lookup
  const blockMap = useMemo(() => {
    return new Map(blocks.map((block) => [block.id, block]));
  }, [blocks]);

  // Table ID -> Table mapping
  const tableMap = useMemo(() => {
    return new Map(tables.map((table) => [table.id, table]));
  }, [tables]);

  // Block assignments grouped by table
  const blockAssignmentsByTable = useMemo(() => {
    const map = new Map<number, BlockAssignment[]>();

    for (const assignment of blockAssignments) {
      if (!assignment.table_id) continue;

      const existing = map.get(assignment.table_id);
      if (existing) {
        existing.push(assignment);
      } else {
        map.set(assignment.table_id, [assignment]);
      }
    }

    return map;
  }, [blockAssignments]);

  // Block assignments grouped by block
  const blockAssignmentsByBlock = useMemo(() => {
    const map = new Map<number, BlockAssignment[]>();

    for (const assignment of blockAssignments) {
      const existing = map.get(assignment.block_id);
      if (existing) {
        existing.push(assignment);
      } else {
        map.set(assignment.block_id, [assignment]);
      }
    }

    return map;
  }, [blockAssignments]);

  // Reservations grouped by table
  const reservationsByTable = useMemo(() => {
    const map = new Map<number, Reservation[]>();
    const { dayStart, dayEnd } = dateBoundaries;

    for (const reservation of reservations) {
      const start = parseISO(reservation.start_at);
      const end = parseISO(reservation.end_at);

      // Filter by date and active status
      const isForThisDay = start < dayEnd && end > dayStart;
      const isActiveStatus = reservation.status === 'confirmed' || reservation.status === 'seated';

      if (!isForThisDay || !isActiveStatus) continue;

      // Standard table
      if (reservation.table_id) {
        const existing = map.get(reservation.table_id);
        if (existing) {
          existing.push(reservation);
        } else {
          map.set(reservation.table_id, [reservation]);
        }
      }

      // Temporary table mapping
      const tempTableId = reservationToTempTableMap.get(reservation.id);
      if (tempTableId !== undefined && reservation.table_id === null) {
        const existing = map.get(tempTableId);
        if (existing) {
          existing.push(reservation);
        } else {
          map.set(tempTableId, [reservation]);
        }
      }
    }

    return map;
  }, [reservations, dateBoundaries, reservationToTempTableMap]);

  // Orders grouped by table
  const ordersByTable = useMemo(() => {
    const map = new Map<number, Order[]>();

    for (const order of orders) {
      if (!order.table_id) continue;

      const existing = map.get(order.table_id);
      if (existing) {
        existing.push(order);
      } else {
        map.set(order.table_id, [order]);
      }
    }

    return map;
  }, [orders]);

  // Waitlist reservations (pending/confirmed without table or on temp table)
  const waitlistReservations = useMemo(() => {
    const { dayStart, dayEnd } = dateBoundaries;

    return reservations
      .filter((r) => {
        const startDate = parseISO(r.start_at);
        const endDate = parseISO(r.end_at);
        return startDate < dayEnd && endDate > dayStart;
      })
      .filter((r) => {
        return r.status !== 'completed' && r.status !== 'canceled' && r.status !== 'no_show';
      })
      .sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime());
  }, [reservations, dateBoundaries]);

  // Block templates for sidebar
  const blockTemplates = useMemo(() => {
    const { dayStart, dayEnd } = dateBoundaries;

    return blocks
      .filter((block) => {
        const blockStart = parseISO(block.start_at);
        const blockEnd = parseISO(block.end_at);
        if (blockStart >= dayEnd || blockEnd <= dayStart) return false;
        return true;
      })
      .sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime());
  }, [blocks, dateBoundaries]);

  // Function to get reservations for a specific table
  const getTableReservations = useCallback(
    (tableId: number): Reservation[] => {
      return reservationsByTable.get(tableId) || [];
    },
    [reservationsByTable]
  );

  // Function to get orders for a specific table
  const getTableOrders = useCallback(
    (tableId: number): Order[] => {
      return ordersByTable.get(tableId) || [];
    },
    [ordersByTable]
  );

  // Function to check if table has time conflict
  const hasTimeConflict = useCallback(
    (reservation: Reservation, tableId: number): boolean => {
      const start = parseISO(reservation.start_at);
      const end = parseISO(reservation.end_at);
      const existing = getTableReservations(tableId).filter((r) => r.id !== reservation.id);

      return existing.some((r) => {
        const rStart = parseISO(r.start_at);
        const rEnd = parseISO(r.end_at);
        return start < rEnd && end > rStart;
      });
    },
    [getTableReservations]
  );

  // Function to check if table has block conflict
  const hasBlockConflict = useCallback(
    (tableId: number, startAt: string, endAt: string): boolean => {
      if (tableId <= 0) return false;

      const start = parseISO(startAt);
      const end = parseISO(endAt);
      const assignments = blockAssignmentsByTable.get(tableId) || [];

      return assignments.some((assignment) => {
        const block = blockMap.get(assignment.block_id);
        if (!block) return false;

        const blockStart = parseISO(block.start_at);
        const blockEnd = parseISO(block.end_at);
        return start < blockEnd && end > blockStart;
      });
    },
    [blockAssignmentsByTable, blockMap]
  );

  // Function to get block status for a table
  const getBlockStatus = useCallback(
    (
      tableId: number
    ): {
      isBlockedNow: boolean;
      isBlocked: boolean;
      timeRange: string;
      reason?: string;
    } | null => {
      if (tableId <= 0) return null;

      const { dayStart, dayEnd, isToday } = dateBoundaries;
      const today = new Date();

      if (!isToday && startOfDay(selectedDate) < startOfDay(today)) {
        return null;
      }

      const assignments = blockAssignmentsByTable.get(tableId) || [];
      const tableBlocks = assignments
        .map((assignment) => blockMap.get(assignment.block_id))
        .filter((block): block is Block => !!block)
        .filter((block) => {
          const blockStart = parseISO(block.start_at);
          const blockEnd = parseISO(block.end_at);
          return blockStart < dayEnd && blockEnd > dayStart;
        })
        .filter((block) => {
          if (isToday) {
            return parseISO(block.end_at) > today;
          }
          return true;
        })
        .sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime());

      if (tableBlocks.length === 0) return null;

      let blockNow = null;
      if (isToday) {
        const nowTime = new Date();
        blockNow = tableBlocks.find((block) => {
          const blockStart = parseISO(block.start_at);
          const blockEnd = parseISO(block.end_at);
          return nowTime >= blockStart && nowTime <= blockEnd;
        });
      }

      if (blockNow) {
        const startLabel = format(parseISO(blockNow.start_at), 'HH:mm');
        const endLabel = format(parseISO(blockNow.end_at), 'HH:mm');
        return {
          isBlockedNow: true,
          isBlocked: true,
          timeRange: `${startLabel}–${endLabel}`,
          reason: blockNow.reason || undefined,
        };
      }

      const nextBlock = tableBlocks.find((block) => parseISO(block.start_at) >= dayStart);
      if (nextBlock) {
        const startLabel = format(parseISO(nextBlock.start_at), 'HH:mm');
        const endLabel = format(parseISO(nextBlock.end_at), 'HH:mm');
        return {
          isBlockedNow: false,
          isBlocked: true,
          timeRange: `${startLabel}–${endLabel}`,
          reason: nextBlock.reason || undefined,
        };
      }

      const fallback = tableBlocks[0];
      const fallbackStart = format(parseISO(fallback.start_at), 'HH:mm');
      const fallbackEnd = format(parseISO(fallback.end_at), 'HH:mm');
      return {
        isBlockedNow: false,
        isBlocked: true,
        timeRange: `${fallbackStart}–${fallbackEnd}`,
        reason: fallback.reason || undefined,
      };
    },
    [blockAssignmentsByTable, blockMap, dateBoundaries, selectedDate]
  );

  // Function to get table name
  const getTableName = useCallback(
    (tableId: number | null): string => {
      if (!tableId) return 'Kein Tisch';
      const table = tableMap.get(tableId);
      return table ? table.number : 'Unbekannt';
    },
    [tableMap]
  );

  // Function to get reservation table label
  const getReservationTableLabel = useCallback(
    (reservation: Reservation): string | null => {
      if (reservation.table_id) {
        return getTableName(reservation.table_id);
      }
      const mappedTempTableId = reservationToTempTableMap.get(reservation.id);
      if (!mappedTempTableId) return null;
      const tempTable = tableMap.get(mappedTempTableId);
      return tempTable ? tempTable.number : null;
    },
    [getTableName, reservationToTempTableMap, tableMap]
  );

  // Function to get block table labels
  const getBlockTableLabels = useCallback(
    (block: Block): string[] => {
      const assignments = blockAssignmentsByBlock.get(block.id) || [];
      const labels = assignments
        .filter((a) => a.table_id)
        .map((a) => {
          const table = tableMap.get(a.table_id!);
          return table ? table.number : String(a.table_id);
        })
        .filter(Boolean);

      return Array.from(new Set(labels));
    },
    [blockAssignmentsByBlock, tableMap]
  );

  return {
    // Cached data
    dateBoundaries,
    blockMap,
    tableMap,
    blockAssignmentsByTable,
    blockAssignmentsByBlock,
    reservationsByTable,
    ordersByTable,
    waitlistReservations,
    blockTemplates,

    // Functions
    getTableReservations,
    getTableOrders,
    hasTimeConflict,
    hasBlockConflict,
    getBlockStatus,
    getTableName,
    getReservationTableLabel,
    getBlockTableLabels,
  };
}
