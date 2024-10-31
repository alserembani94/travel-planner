import { LayoutGrid, Rows } from "lucide-react"
import { Button } from "../ui/button"

interface LayoutToggleProps {
  layout: "default" | "compact"
  setLayout: (layout: "default" | "compact") => void
}

export function LayoutToggle({ layout, setLayout }: LayoutToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setLayout(layout === "default" ? "compact" : "default")}
    >
      {layout === "default" ? (
        <Rows className="h-5 w-5" />
      ) : (
        <LayoutGrid className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle layout</span>
    </Button>
  )
}