"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const groups = [
  {
    label: "Workspace",
    items: [
      ["/", "◫", "Overview"],
      ["/media", "▧", "Media library"],
      ["/images", "▣", "Images"],
      ["/profiles", "♙", "People"],
      ["/ratings", "↕", "Ratings & votes"],
    ],
  },
  {
    label: "Generation",
    items: [
      ["/manage/prompt-chains", "↗", "Prompt chains"],
      ["/manage/prompt-steps", "≡", "Chain steps"],
      ["/manage/prompt-mix", "⇄", "Chain mix"],
      ["/manage/requests", "↳", "Requests"],
      ["/manage/responses", "↲", "LLM responses"],
    ],
  },
  {
    label: "Catalog",
    items: [
      ["/manage/terms", "Aa", "Terms"],
      ["/manage/examples", "✦", "AI examples"],
      ["/manage/models", "◈", "LLM models"],
      ["/manage/providers", "◇", "LLM providers"],
    ],
  },
  {
    label: "Registration",
    items: [
      ["/manage/signup-domains", "◎", "Signup domains"],
      ["/manage/email-whitelist", "@", "Email whitelist"],
    ],
  },
];
export function Navigation() {
  const path = usePathname();
  return (
    <nav aria-label="Admin navigation">
      {groups.map((group) => (
        <div className="nav-group" key={group.label}>
          <div className="nav-section">{group.label}</div>
          {group.items.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
            >
              {icon}
              <span>{label}</span>
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
