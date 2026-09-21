import * as Sentry from '@sentry/react';

export type BusinessEventType = 
  | 'delivery_created'
  | 'stock_count_submitted'
  | 'purchase_order_generated'
  | 'user_login'
  | 'user_logout'
  | 'ingredient_created'
  | 'ingredient_updated'
  | 'menu_item_created'
  | 'sales_imported'
  | 'pos_void_created'
  | 'access_log_created'
  | 'ai_investigation_run'
  | 'system_sync_success'
  | 'system_sync_error';

export interface EventLogEntry {
  id: string;
  timestamp: string;
  event: BusinessEventType | string;
  metadata?: Record<string, unknown>;
}

const eventHistory: EventLogEntry[] = [];
const MAX_HISTORY = 100;

/**
 * Structured operational event logging helper
 * Sends operational signals as Sentry breadcrumbs and keeps an in-memory audit trail
 */
export function logEvent(
  eventName: BusinessEventType | string, 
  metadata?: Record<string, unknown>
): void {
  const entry: EventLogEntry = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    event: eventName,
    metadata,
  };

  eventHistory.unshift(entry);
  if (eventHistory.length > MAX_HISTORY) {
    eventHistory.pop();
  }

  // Safe operational logging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Event: ${eventName}]`, metadata || {});
  }

  // Record breadcrumb in Sentry if initialized
  try {
    Sentry.addBreadcrumb({
      category: 'business_event',
      message: eventName,
      data: metadata,
      level: 'info',
      timestamp: Date.now() / 1000,
    });
  } catch {
    // Sentry not initialized or in testing environment
  }
}

/**
 * Returns recent operational event logs for debugging or auditing
 */
export function getRecentEventLogs(): EventLogEntry[] {
  return [...eventHistory];
}
