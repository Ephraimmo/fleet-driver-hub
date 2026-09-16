import type {
  DeliveryEvent,
  DeliveryStatus,
  DriverOrderViewModel,
  Order,
  OrderItem,
  OrderPayment,
  OrderTimelineEntry,
  Restaurant,
} from "@/types/forkfleet";
import { orderBranchId, orderRestaurantId, toArray } from "./repo";

export function buildOrderViewModel(
  order: Order,
  opts: {
    restaurant?: Restaurant | null;
    events?: DeliveryEvent[];
  } = {},
): DriverOrderViewModel {
  const restaurantId = orderRestaurantId(order) ?? "";
  const branchId = orderBranchId(order) ?? "";
  const restaurant = opts.restaurant ?? null;
  const branchRecord = restaurant?.branches?.[branchId] as Record<string, unknown> | undefined;

  const branchName =
    (order.branch_name as string) || ((branchRecord?.["name"] as string) ?? branchId ?? "—");
  const branchAddress =
    (branchRecord?.["address"] as string) || (restaurant?.address as string) || "";

  // Coordinates saved directly on the order document take priority (Firestore contract:
  // branch_latitude / branch_longitude), then the branch record, then the restaurant.
  const num = (v: unknown): number | undefined => {
    const n = typeof v === "string" ? Number(v) : (v as number);
    return typeof n === "number" && isFinite(n) ? n : undefined;
  };
  const branchLat =
    num(order["branch_latitude"]) ??
    num(branchRecord?.["latitude"]) ??
    num(restaurant?.latitude);
  const branchLng =
    num(order["branch_longitude"]) ??
    num(branchRecord?.["longitude"]) ??
    num(restaurant?.longitude);

  const items = toArray<OrderItem>(order.items);
  const orderTimeline = (order.timeline as OrderTimelineEntry[]) ?? [];
  const payment: OrderPayment | null = order.payment ?? null;

  return {
    id: order.id,
    orderNumber: order.order_number ?? order.id,
    customer: {
      name: order.customer_name ?? "Customer",
      phone: order.customer_phone ?? "",
      ...(order.customer_id ? { id: order.customer_id } : {}),
    },
    restaurant: {
      id: restaurantId,
      name: order.restaurant_name ?? (restaurant?.name as string) ?? restaurantId,
      address: (restaurant?.address as string) ?? "",
      latitude: branchLat as number,
      longitude: branchLng as number,
      phone: (branchRecord?.["phone"] as string) ?? (restaurant?.phone as string),
    },
    branch: {
      id: branchId,
      name: branchName,
      address: branchAddress,
      latitude: branchLat as number,
      longitude: branchLng as number,
      phone: branchRecord?.["phone"] as string,
    },
    pickupAddress: branchAddress || (restaurant?.address as string) || "",
    deliveryAddress: order.delivery_address ?? {},
    items,
    subtotal: Number(order.subtotal ?? 0),
    deliveryFee: Number(order.delivery_fee ?? 0),
    serviceFee: Number(order.service_fee ?? 0),
    tax: Number(order.tax ?? 0),
    discount: Number(order.discount ?? 0),
    tip: Number(order.tip ?? 0),
    total: Number(order.total ?? 0),
    paymentStatus: order.payment?.status ?? order.payment_status ?? "unknown",
    paymentMethod: order.payment?.method ?? order.payment_method ?? "unknown",
    payment,
    orderStatus: order.status,
    driverStatus: resolveDriverStatus(order),
    timeline: opts.events ?? [],
    orderTimeline,
    eta: order.eta_minutes ?? null,
    distanceKm: order.delivery_distance_km ?? null,
    driverId: order.driver_id ?? null,
    specialInstructions: order.special_instructions ?? "",
    deliveryInstructions: order.delivery_instructions ?? "",
    proofOfDelivery: (order["proof_of_delivery"] as DriverOrderViewModel["proofOfDelivery"]) ?? null,
    raw: order,
  };
}

/** Progress ranking so the furthest-along signal always wins. */
const PROGRESS_RANK: Record<string, number> = {
  pending: 0,
  offered: 0,
  accepted: 1,
  assigned: 1,
  arrived_at_restaurant: 2,
  picked_up: 3,
  collected: 3,
  out_for_delivery: 4,
  in_transit: 4,
  on_the_way: 4,
  arrived_at_customer: 5,
  delivered: 6,
  completed: 6,
};

const NORMALIZE: Record<string, DeliveryStatus> = {
  collected: "picked_up",
  out_for_delivery: "on_the_way",
  in_transit: "on_the_way",
  completed: "delivered",
};

const TERMINAL: DeliveryStatus[] = ["cancelled", "failed", "rejected"];

/**
 * Combines driver_status, order status and the order timeline so a pickup
 * recorded anywhere (driver app, restaurant dashboard, admin) is reflected live.
 */
function resolveDriverStatus(order: Order): DeliveryStatus {
  const candidates: string[] = [];
  const raw = order["driver_status"];
  if (typeof raw === "string") candidates.push(raw);
  if (order.status) candidates.push(String(order.status));
  const timeline = toArray<OrderTimelineEntry>(order.timeline);
  for (const entry of timeline) if (entry?.status) candidates.push(String(entry.status));

  for (const c of candidates) {
    const normalized = (NORMALIZE[c] ?? c) as DeliveryStatus;
    if (TERMINAL.includes(normalized)) return normalized;
  }

  let best: DeliveryStatus | null = null;
  let bestRank = -1;
  for (const c of candidates) {
    const rank = PROGRESS_RANK[c];
    if (rank === undefined) continue;
    if (rank > bestRank) {
      bestRank = rank;
      best = (NORMALIZE[c] ?? c) as DeliveryStatus;
    }
  }
  if (best) {
    if (bestRank <= 1) return order.driver_id ? "assigned" : "offered";
    return best;
  }
  return inferDriverStatus(order);
}

function inferDriverStatus(order: Order): DeliveryStatus {
  const rawStatus = String(order.status);
  switch (rawStatus) {
    case "delivered":
      return "delivered";
    case "on_the_way":
      return "on_the_way";
    case "picked_up":
      return "picked_up";
    case "assigned":
    case "accepted":
      return order.driver_id ? "assigned" : "offered";
    case "cancelled":
      return "cancelled";
    case "failed":
      return "failed";
    case "rejected":
      return "rejected";
    default:
      return order.driver_id ? "assigned" : "pending";
  }
}

/** Next driver action for the active delivery flow. */
export function nextAction(status: DeliveryStatus):
  | { key: "arrive_restaurant" | "pickup" | "start" | "arrive_customer" | "complete"; label: string }
  | null {
  switch (status) {
    case "offered":
    case "accepted":
    case "assigned":
      return { key: "arrive_restaurant", label: "Arrive at restaurant" };
    case "arrived_at_restaurant":
      return { key: "pickup", label: "Pick up order" };
    case "picked_up":
      return { key: "start", label: "Start delivery" };
    case "on_the_way":
      return { key: "arrive_customer", label: "Arrive at customer" };
    case "arrived_at_customer":
      return { key: "complete", label: "Complete delivery" };
    default:
      return null;
  }
}

export const ACTIVE_STATUSES: DeliveryStatus[] = [
  "offered",
  "accepted",
  "assigned",
  "arrived_at_restaurant",
  "picked_up",
  "on_the_way",
  "arrived_at_customer",
];
