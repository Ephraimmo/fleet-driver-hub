import { Navigation2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { directionsUrl, type MapDestination } from "@/lib/geo";
import { cn } from "@/lib/utils";

/**
 * One-tap button that launches Google Maps at the order's saved location.
 *
 * Rendered as a real anchor (not window.open) so it is never treated as a
 * blocked pop-up inside the in-app/preview iframe or an embedded webview.
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
  const url = directionsUrl(destination);

  if (!url) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("gap-2 font-semibold", className)}
        onClick={() => toast.error("No location available for this stop yet.")}
      >
        <Navigation2 className="size-5" />
        {label}
      </Button>
    );
  }

  return (
    <Button asChild variant={variant} size={size} className={cn("gap-2 font-semibold", className)}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        <Navigation2 className="size-5" />
        {label}
      </a>
    </Button>
  );
}
