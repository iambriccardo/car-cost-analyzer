import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";

type Placement = "top" | "bottom";

export function Tooltip({
  content,
  children,
  widthClass = "w-56"
}: {
  content: ReactNode;
  children: ReactNode;
  widthClass?: string;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    placement: "top" as Placement
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 10;
    const canPlaceAbove = triggerRect.top >= tooltipRect.height + gap + viewportPadding;
    const placement: Placement = canPlaceAbove ? "top" : "bottom";

    let left = triggerRect.left + triggerRect.width / 2;
    const halfWidth = tooltipRect.width / 2;
    left = Math.max(viewportPadding + halfWidth, left);
    left = Math.min(window.innerWidth - viewportPadding - halfWidth, left);

    const top =
      placement === "top"
        ? triggerRect.top - gap
        : triggerRect.bottom + gap;

    setPosition({ left, top, placement });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    updatePosition();

    const handleViewportChange = () => updatePosition();
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [open, updatePosition]);

  return (
    <span
      ref={triggerRef}
      className="inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {mounted
        ? createPortal(
            <span
              ref={tooltipRef}
              role="tooltip"
              className={`pointer-events-none fixed z-[9999] max-w-[min(calc(100vw-24px),28rem)] rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs leading-5 text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.75)] transition duration-150 ${widthClass} ${
                open ? "visible opacity-100" : "invisible opacity-0"
              }`}
              style={{
                left: position.left,
                top: position.top,
                transform:
                  position.placement === "top"
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)"
              }}
            >
              {content}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}
