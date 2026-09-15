import { Navigation2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { directionsUrl, type MapDestination } from "@/lib/geo";
import { cn } from "@/lib/utils";

/**
 * One-tap button that copies a Google Maps link for the order's saved
 * location to the clipboard. Opening a new tab was being blocked inside
 * the in-app/preview iframe, so we copy the link instead and the driver
 * can paste it into any browser or maps app.
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

  const copyLink = async () => {
    if (!url) {
      toast.error("No location available for this stop yet.");
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older / non-secure contexts
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Map link copied — paste it into your browser or maps app.", {
        description: url,
      });
    } catch {
      toast.error("Could not copy the link. Long-press the address to copy manually.");
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-2 font-semibold", className)}
      onClick={(e) => {
        e.stopPropagation();
        void copyLink();
      }}
    >
      <Navigation2 className="size-5" />
      {label}
    </Button>
  );
}
