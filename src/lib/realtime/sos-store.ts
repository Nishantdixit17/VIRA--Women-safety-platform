export interface SosEvent {
  id: string;
  userName: string;
  userPhone: string;
  placeName: string;
  complaintType: string;
  description: string;
  reportedAt: string;
  assignedStation: string;
  status: "UNSOLVED" | "IN_PROGRESS" | "SOLVED";
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  solvedAt?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  mapsLink?: string;
  sirenActive?: boolean;
  silent?: boolean;
  sirenStartedAt?: string;
  sirenStoppedAt?: string;
  lastLocationAt?: string;
  contactsNotified?: string[];
  trail?: Array<[number, number]>;
  updatedAt: number;
}

const g = globalThis as unknown as { __viraSosEvents?: Map<string, SosEvent> };
const events: Map<string, SosEvent> = (g.__viraSosEvents ??= new Map());

export function upsertSosEvent(
  patch: Partial<SosEvent> & { id: string }
): SosEvent {
  const prev = events.get(patch.id);
  const next = {
    ...(prev ?? ({} as SosEvent)),
    ...patch,
    updatedAt: Date.now(),
  } as SosEvent;
  if (patch.lat !== undefined && patch.lng !== undefined) {
    const trail = [...(prev?.trail ?? [])];
    const last = trail[trail.length - 1];
    if (!last || last[0] !== patch.lat || last[1] !== patch.lng) {
      trail.push([patch.lat, patch.lng]);
    }
    next.trail = trail.slice(-200);
  }
  events.set(next.id, next);
  return next;
}

export function listSosEvents(): SosEvent[] {
  return [...events.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}
