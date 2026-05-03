"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Upload" },
  { href: "/collection", label: "My collection" },
  { href: "/battle", label: "Battle" },
];

const linkClasses =
  "rounded underline-offset-4 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/60 px-1 py-0.5";

type SiteNavProps = {
  className?: string;
};

export default function SiteNav({ className }: SiteNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={`flex w-full flex-wrap items-center justify-end gap-x-5 gap-y-2 text-sm font-semibold ${className ?? ""}`}
      aria-label="Site"
    >
      {LINKS.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`${linkClasses} ${
              active
                ? "text-white underline"
                : "text-white/70 hover:text-white hover:underline"
            }`}
          >
            {href === "/battle" ? `\u2694\uFE0F ${label}` : label}
          </Link>
        );
      })}
    </nav>
  );
}
