import { ThemeToggle } from "../theme/theme-toggle"
import { LayoutToggle } from "./layout-toggle"

interface HeaderProps {
  layout: "default" | "compact"
  setLayout: (layout: "default" | "compact") => void
}

export function Header({ layout, setLayout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="flex items-center space-x-2">
            <LayoutToggle layout={layout} setLayout={setLayout} />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}