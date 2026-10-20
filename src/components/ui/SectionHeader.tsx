import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
}

export function SectionHeader({ eyebrow, title, description, align = "left", action }: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-4 ${
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"
      }`}
    >
      <div className={align === "center" ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tightest md:text-4xl lg:text-5xl">
          {title}
        </h2>
        {description && <p className="mt-4 text-base leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
