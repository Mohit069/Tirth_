import type { ReactNode, SVGProps } from "react";
import { ICON_PATHS, ICON_STROKE, type IconName } from "./icon-paths";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** An icon from ICON_PATHS, picked by name (these are also drawn into the token photo). */
export function Icon({ name, ...p }: IconProps & { name: IconName }) {
  return (
    <Svg {...p}>
      {ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </Svg>
  );
}

/** Temple shikhar with a flag – the app's mark. */
export function ShikharIcon(p: IconProps) {
  return <Icon {...p} name="shikhar" />;
}

export function CupIcon(p: IconProps) {
  return <Icon {...p} name="cup" />;
}

/** Plate with fork and spoon (bhojan). */
export function MealIcon(p: IconProps) {
  return <Icon {...p} name="meal" />;
}

export function BedIcon(p: IconProps) {
  return <Icon {...p} name="bed" />;
}

export function WhatsAppIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20.2l1.2-3.7a8.3 8.3 0 1 1 3.2 3.1L4 20.2z" />
      <path
        d="M9.3 8.6c.2-.5.5-.6.8-.6h.5c.2 0 .4.1.5.3l.8 1.8c.1.2 0 .4-.1.6l-.5.6c.6 1.1 1.5 2 2.6 2.6l.6-.5c.2-.1.4-.2.6-.1l1.8.8c.2.1.3.3.3.5v.5c0 .3-.1.6-.6.9-.5.3-1.6.5-3.2-.3-1.7-.8-2.9-2.1-3.6-3.6-.6-1.3-.4-2.4-.1-3z"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  );
}

export function PhoneIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5.2 3.8h3.3l1.6 4.1-2.1 1.4a11.3 11.3 0 0 0 6.7 6.7l1.4-2.1 4.1 1.6v3.3a1.6 1.6 0 0 1-1.7 1.6A15.6 15.6 0 0 1 3.6 5.5a1.6 1.6 0 0 1 1.6-1.7z" />
    </Svg>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function MinusIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12h14" />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function UsersIcon(p: IconProps) {
  return <Icon {...p} name="users" />;
}

export function CalendarIcon(p: IconProps) {
  return <Icon {...p} name="calendar" />;
}

export function IdCardIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M5.8 16.2c.5-1.5 1.7-2.3 3.2-2.3s2.7.8 3.2 2.3M14.5 10h4M14.5 13.5h3" />
    </Svg>
  );
}

export function CameraIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9z" />
      <circle cx="12" cy="12.8" r="3.3" />
    </Svg>
  );
}

export function CarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.1 17H5a1 1 0 0 1-1-1v-3.5l2-4.5a2 2 0 0 1 1.8-1.2h8.4A2 2 0 0 1 18 8l2 4.5V16a1 1 0 0 1-1 1h-1.1" />
      <path d="M4.6 12.5h14.8M9.9 17h4.2" />
      <circle cx="8" cy="17" r="1.9" />
      <circle cx="16" cy="17" r="1.9" />
    </Svg>
  );
}

export function MapPinIcon(p: IconProps) {
  return <Icon {...p} name="mapPin" />;
}

export function MoonIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.3 6.3 0 0 0 10.1 10.1z" />
    </Svg>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </Svg>
  );
}

export function LogoutIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 16l-4-4 4-4M6 12h10" />
    </Svg>
  );
}

export function DownloadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" />
    </Svg>
  );
}

export function PrinterIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 9V4h10v5" />
      <rect x="4" y="9" width="16" height="7.5" rx="1.5" />
      <path d="M7 14h10v6H7z" />
    </Svg>
  );
}

export function QrIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 19h2M19 14h1" />
    </Svg>
  );
}

export function AlertIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </Svg>
  );
}

export function ArrowLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Svg>
  );
}

export function ChevronLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.5 6l-6 6 6 6" />
    </Svg>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.5 6l6 6-6 6" />
    </Svg>
  );
}

export function GlobeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </Svg>
  );
}

export function TicketIcon(p: IconProps) {
  return <Icon {...p} name="ticket" />;
}

export function GridIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </Svg>
  );
}

export function ListIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
    </Svg>
  );
}
