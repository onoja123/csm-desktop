import { ago } from './format';
import type { DeliveryHealth, DeliveryResult, HubIntegration } from '@/types';

export function deliveryHealth(i: HubIntegration): DeliveryHealth {
  const when = i.last_delivery_at ? ` ${ago(i.last_delivery_at)}` : '';
  const results: Record<DeliveryResult, DeliveryHealth> = {
    recorded: { tone: 'ok', text: `Receiving events from Sentry. Last error${when}.` },
    duplicate: { tone: 'ok', text: `Receiving events from Sentry. Last delivery${when} was a redelivery.` },
    ignored: { tone: 'ok', text: `Sentry is reaching Hub. The last delivery${when} was not an error, so it was ignored.` },
    test: { tone: 'ok', text: `Test verified${when}. Waiting for Sentry's first event.` },
    invalid_signature: { tone: 'err', text: `The last delivery${when} had an invalid signature: the client secret here does not match the one in Sentry.` },
    no_secret: { tone: 'err', text: `Sentry is sending events${when}, but the client secret is not set yet, so Hub refuses them.` },
    invalid_payload: { tone: 'err', text: `The last delivery${when} could not be read as a Sentry event.` },
  };
  if (!i.last_delivery_result)
    return i.has_secret ? { tone: 'idle', text: 'No deliveries yet. Sentry sends one when an error happens, or send a test below.' } : { tone: 'idle', text: 'Waiting for the client secret.' };
  return results[i.last_delivery_result] ?? { tone: 'idle', text: i.last_delivery_result };
}
