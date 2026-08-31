import { Navigation2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/appStore";
import { openDirections, type MapDestination } from "@/lib/geo";
import { cn } from "@/lib/utils";

/**
 * One-tap button that launches Google Maps turn-by-turn directions
 * from the driver's current GPS position to the given destination.
 */
export function NavigateButton({
  destination,
  label = "Directions",
  variant = "outline",
  className,
  size = "lg",
}: {
  destination: MapDestination;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  size?: "sm" | "lg" | "default";
}) {
  const position = useAppStore((s) => s.position);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-2 font-semibold", className)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = openDirections(destination, position);
        if (!ok) toast.error("No location available for this stop yet.");
      }}
    >
      <Navigation2 className="size-5" />
      {label}
    </Button>
  );
}
