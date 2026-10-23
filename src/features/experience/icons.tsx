import React from "react";
export function Icon({
  name,
  className = "",
}: {
  name:
    | "logo"
    | "upload"
    | "clock"
    | "spark"
    | "alert"
    | "arrow-up"
    | "arrow-down"
    | "close"
    | "chat"
    | "chevron"
    | "check";
  className?: string;
}) {
  const paths: Record<typeof name, React.ReactNode> = {
    logo: (
      <>
        <path d="M3 15c2.2-5 4.4-5 6.6 0s4.4 5 6.6 0S19.4 10 21 9" />
        <path d="M17 9h4v4" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z" />
        <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v4m0 3h.01" />
      </>
    ),
    "arrow-up": <path d="M12 19V5m0 0L7 10m5-5 5 5" />,
    "arrow-down": <path d="M12 5v14m0 0-5-5m5 5 5-5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    chat: <path d="M21 11a8 8 0 0 1-8 8H8l-5 3V11a9 9 0 0 1 18 0Z" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
