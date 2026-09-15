import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, MapPin, Package, Store, AlertTriangle } from "lucide-react";
import type { DriverOrderViewModel } from "@/types/forkfleet";
import { formatKm, formatMoney, haversineKm } from "@/lib/geo";
import { useAppStore } from "@/stores/appStore";
import { StatusPill } from "./StatusPill";
import { NavigateButton } from "./NavigateButton";
import { Button } from "@/components/ui/button";

const NEXT_STEP: Record<string, string> = {
  offered: "Accept to start this delivery",
  assigned: "Drive to the restaurant",
  arrived_at_restaurant: "Check the order, then pick it up",
  picked_up: "Start the drive to the customer",
  on_the_way: "Drive to the customer",
  arrived_at_customer: "Hand over and complete",
};

export function DeliveryCard({
  order,
  onAccept,
  onReject,
  busy,
}: {
  order: DriverOrderViewModel;
  onAccept?: () => void;
  onReject?: () => void;
  busy?: boolean;
}) {
  const position = useAppStore((s) => s.position);
  const pickupPoint =
    order.branch.latitude && order.branch.longitude
      ? { latitude: order.branch.latitude, longitude: order.branch.longitude }
      : null;
  const pickupKm = position && pickupPoint ? haversineKm(position, pickupPoint) : null;
  const earnings = order.deliveryFee + order.tip;
  const nextStep = NEXT_STEP[order.driverStatus];
  const headingToCustomer =
    order.driverStatus === "arrived_at_restaurant" ||
    order.driverStatus === "picked_up" ||
    order.driverStatus === "on_the_way" ||
    order.driverStatus === "arrived_at_customer";
  const isPast =
    order.driverStatus === "delivered" ||
    order.driverStatus === "cancelled" ||
    order.driverStatus === "failed" ||
    order.driverStatus === "rejected";
  const note = order.specialInstructions || order.deliveryInstructions;
  const dropoff = [order.deliveryAddress.street, order.deliveryAddress.city]
    .filter(Boolean)
    .join(", ");

  if (isPast) {
    return (
      <Link
        to="/delivery/$orderId"
        params={{ orderId: order.id }}
        className="surface-card flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold">{order.orderNumber}</p>
          <p className="truncate text-sm text-muted-foreground">{order.restaurant.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-bold">{formatMoney(earnings)}</p>
          <StatusPill status={order.driverStatus} className="mt-1" />
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    );
  }

  return (
    <article className="surface-card overflow-hidden shadow-elevate transition-shadow hover:shadow-lg">
      <header className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold leading-tight">{order.orderNumber}</p>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            <Store className="size-3.5 shrink-0" />
            <span className="truncate">{order.restaurant.name}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-2xl font-bold leading-none text-primary">
            {formatMoney(earnings)}
          </p>
          <StatusPill status={order.driverStatus} className="mt-1.5" />
        </div>
      </header>

      <div className="space-y-2.5 px-4 pb-4">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-1.5">
            <Store className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-semibold">{formatKm(pickupKm)}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-4 shrink-0 text-primary" />
            <span className="font-semibold">{formatKm(order.distanceKm)}</span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-muted-foreground">
            <Package className="size-4" />
            {order.items.length}
          </span>
        </div>

        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="line-clamp-2">{dropoff || "Address not provided"}</span>
        </p>

        {note && (
          <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs leading-snug text-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span className="line-clamp-2">{note}</span>
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-border bg-muted/30 p-4">
        {nextStep && (
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {nextStep}
          </p>
        )}

        {onAccept ? (
          <div className="flex gap-2">
            {onReject && (
              <Button
                variant="outline"
                size="lg"
                className="h-14 flex-1 text-base"
                disabled={busy}
                onClick={onReject}
              >
                Reject
              </Button>
            )}
            <Button
              size="lg"
              className="h-14 flex-[2] text-base font-bold"
              disabled={busy}
              onClick={onAccept}
            >
              {busy ? "Accepting…" : "Accept delivery"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button asChild size="lg" className="h-14 w-full text-base font-bold">
              <Link to="/delivery/$orderId" params={{ orderId: order.id }}>
                Continue delivery
                <ChevronRight className="size-5" />
              </Link>
            </Button>
            <NavigateButton
              className="h-12 w-full border-primary/30 text-primary"
              label={headingToCustomer ? "Directions to customer" : "Directions to restaurant"}
              destination={
                headingToCustomer
                  ? {
                      latitude: order.deliveryAddress.latitude,
                      longitude: order.deliveryAddress.longitude,
                      address: dropoff,
                    }
                  : {
                      latitude: order.branch.latitude,
                      longitude: order.branch.longitude,
                      address: `${order.restaurant.name} ${order.branch.name}`,
                    }
              }
            />
          </div>
        )}
      </div>
    </article>
  );
}
