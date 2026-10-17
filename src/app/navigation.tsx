"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const items = [
  ["/", "◫", "Overview"],
  ["/media", "▧", "Media library"],
  ["/profiles", "♙", "People"],
  ["/ratings", "↕", "Ratings & votes"],
];
export function Navigation() {
  const path = usePathname();
  return <nav aria-label="Admin navigation">{items.map(([href, icon, label]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{icon}<span>{label}</span></Link>)}</nav>;
}
