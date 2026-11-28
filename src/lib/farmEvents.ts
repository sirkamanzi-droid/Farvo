import { supabase } from './supabase';

export type FarmEventType =
  | 'disease_detection'
  | 'advice'
  | 'alert'
  | 'farmer_reply'
  | 'weather_action'
  | 'soil_assessment'
  | 'crop_update'
  | 'livestock_update'
  | 'follow_up';

export type FarmEventSource = 'farmer' | 'kato' | 'system' | 'agronomist' | 'external_service';

type RecordFarmEventInput = {
  userId: string;
  farmId: string;
  eventType: FarmEventType;
  source: FarmEventSource;
  sourceRecordType?: string;
  sourceRecordId?: string | null;
  relatedEventId?: string | null;
  occurredAt?: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
};

/**
 * Writes a small, privacy-conscious event to the farmer's append-only timeline.
 * Event logging is best-effort: it must never block the farmer's main action.
 */
export async function recordFarmEvent(input: RecordFarmEventInput): Promise<void> {
  if (!input.userId || !input.farmId) return;

  const payload = input.payload || {};
  let encoded = '';
  try {
    encoded = JSON.stringify(payload);
  } catch {
    console.warn('Farm event skipped because its payload was not serialisable.');
    return;
  }
  if (encoded.length > 12000) {
    console.warn('Farm event skipped because its payload exceeded the client safety limit.');
    return;
  }

  const { error } = await supabase.from('farm_events').insert({
    user_id: input.userId,
    farm_id: input.farmId,
    event_type: input.eventType,
    source: input.source,
    source_record_type: input.sourceRecordType || null,
    source_record_id: input.sourceRecordId || null,
    related_event_id: input.relatedEventId || null,
    occurred_at: input.occurredAt || new Date().toISOString(),
    idempotency_key: input.idempotencyKey || `farm-event:${crypto.randomUUID()}`,
    payload,
  });

  if (error) {
    console.error('Could not add an item to farm history:', error.message);
  }
}
