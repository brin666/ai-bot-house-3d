import { planDelivery, type DeliveryPlan } from './delivery';
import { catalog, type Kind, type Store } from './store';

type Rooms = Parameters<typeof planDelivery>[1];
type PurchaseResult =
  | { ok: true; plan: DeliveryPlan }
  | { ok: false; reason: 'busy' | 'funds' | 'space' | 'storage' };

/** Reserve the furniture and its cost before the scene begins the delivery animation. */
export function startPurchase(store: Store, kind: Kind, rooms: Rooms, botX: number, botZ: number, busy: boolean): PurchaseResult {
  if (busy) return { ok: false, reason: 'busy' };
  const info = catalog[kind];
  if (store.coins < info.price) return { ok: false, reason: 'funds' };
  const plan = planDelivery(kind, rooms, store.items, botX, botZ);
  if (!plan) return { ok: false, reason: 'space' };
  if (!store.beginPurchase(plan.item, info.price)) return { ok: false, reason: 'storage' };
  store.emit({ type: 'purchase', detail: info.name });
  store.emit({ type: 'delivery', detail: info.name });
  return { ok: true, plan };
}
