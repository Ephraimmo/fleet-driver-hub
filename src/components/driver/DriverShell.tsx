import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Package,
  Wallet,
  Bell,
  User,
  WifiOff,
  Navigation,
  CloudUpload,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthDriver } from "@/hooks/useAuthDriver";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useDriverOrders } from "@/hooks/useDriverOrders";
import { useAppStore } from "@/stores/appStore";
import { onQueueChange, queueSize, flushQueue } from "@/lib/offlineQueue";
import { subscribeNotifications } from "@/lib/repo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";


const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/deliveries", label: "Deliveries", icon: Package },
  { to: "/earnings", label: "Earnings", icon: Wallet },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function DriverShell({ children }: { children: ReactNode }) {
  const { ready, user, driver, profileMissing, createMissingProfile } = useAuthDriver();
  const [creatingProfile, setCreatingProfile] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const connected = useAppStore((s) => s.connected);
  const online = driver?.status === "online";
  const { active } = useDriverOrders();
  const [pending, setPending] = useState(0);
  const [unread, setUnread] = useState(0);

  useConnectivity();
  useLocationTracking({
    enabled: !!driver && (online || active.length > 0),
    driverId: driver?.id ?? null,
    activeOrderId: active[0]?.id ?? null,
    activeStatus: active[0]?.driverStatus ?? null,
  });

  useEffect(() => {
    setPending(queueSize());
    const unsub = onQueueChange(setPending);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!driver?.id) return;
    const unsub = subscribeNotifications(driver.id, (list) =>
      setUnread(list.filter((n) => !n.read).length),
    );
    return () => unsub();
  }, [driver?.id]);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login", replace: true });
  }, [ready, user, navigate]);

  if (!ready || (!driver && !profileMissing)) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (profileMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="surface-card max-w-md space-y-3 p-6 text-center">
          <h1 className="text-xl font-bold">No driver profile linked</h1>
          <p className="text-sm text-muted-foreground">
            Your account signed in successfully, but no ForkFleet driver profile matches it. Create
            your profile now so it appears in the Management Console, or ask operations to link an
            existing driver record.
          </p>
          <Button
            className="w-full"
            disabled={creatingProfile}
            onClick={async () => {
              if (!user) return;
              setCreatingProfile(true);
              try {
                await createMissingProfile();
                toast.success("Driver profile created");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setCreatingProfile(false);
              }
            }}
          >
            {creatingProfile && <Loader2 className="mr-2 size-4 animate-spin" />} Create my driver
            profile
          </Button>
          <Link to="/login" className="block text-sm font-semibold text-primary underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }


  const activeDelivery = active[0];

  return (
    <div className="min-h-screen bg-background pb-28">
      <main className="mx-auto w-full max-w-2xl p-4">{children}</main>

      {(!connected || pending > 0) && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-3">
          <div className="pointer-events-auto flex max-w-2xl items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-xs font-semibold shadow-elevate backdrop-blur">
            {!connected ? (
              <>
                <WifiOff className="size-3.5 text-destructive" />
                <span className="text-muted-foreground">Offline — syncing when back online</span>
              </>
            ) : (
              <button
                onClick={() => void flushQueue()}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <CloudUpload className="size-3.5 text-warning" />
                <span>
                  {pending} update{pending > 1 ? "s" : ""} queued
                </span>
                <span className="text-primary">Sync</span>
              </button>
            )}
          </div>
        </div>
      )}

      {activeDelivery && !pathname.startsWith("/delivery/") && (
        <Link
          to="/delivery/$orderId"
          params={{ orderId: activeDelivery.id }}
          className="fixed inset-x-0 bottom-[4.75rem] z-40 mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-xl border border-border bg-surface/95 px-4 py-2.5 shadow-elevate backdrop-blur"
          style={{ width: "calc(100% - 2rem)" }}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Navigation className="size-4" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Active delivery
              </span>
              <span className="block truncate text-sm font-bold">
                {activeDelivery.orderNumber} · {activeDelivery.driverStatus.replace(/_/g, " ")}
              </span>
            </span>
          </span>
          <span className="shrink-0 text-sm font-bold text-primary">Open →</span>
        </Link>
      )}


      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-2xl">
          {NAV.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-6" />
                {label}
                {to === "/notifications" && unread > 0 && (
                  <span className="absolute right-1/4 top-2 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
