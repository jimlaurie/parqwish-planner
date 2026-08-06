"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WORKFLOWS } from "@/lib/guide-data/workflows";
import { PWA_SCREENS } from "@/lib/guide-data/features-pwa";
import { MOBILE_SCREENS } from "@/lib/guide-data/features-mobile";

const FEATURE_LINKS = [
  { href: "/guide/features/mobile",  label: "Mobile App",      icon: "📱",  soon: false },
  { href: "/guide/features/pwa",     label: "Web Planner",     icon: "🖥️", soon: false },
  { href: "/guide/features/sync",    label: "Data Sync",       icon: "🔄",  soon: false },
  { href: "/guide/features/gps",     label: "GPS Trail",       icon: "📍",  soon: false },
];

interface NavItemProps {
  href: string;
  label: string;
  icon: string;
  isActive: boolean;
  isComingSoon?: boolean;
}

function NavItem({ href, label, icon, isActive, isComingSoon }: NavItemProps) {
  return (
    <Link
      href={isComingSoon ? "#" : href}
      onClick={(e) => { if (isComingSoon) e.preventDefault(); }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 10px",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--text-sm)",
        fontWeight: isActive ? "var(--font-semibold)" : "var(--font-normal)",
        color: isActive ? "var(--color-gold)" : isComingSoon ? "var(--color-text-dim)" : "var(--color-text-secondary)",
        background: isActive ? "color-mix(in srgb, var(--color-gold) 12%, transparent)" : "transparent",
        textDecoration: "none",
        transition: "background var(--motion-fast)",
        cursor: isComingSoon ? "default" : "pointer",
        opacity: isComingSoon ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: "13px" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {isComingSoon && <span style={{ fontSize: "9px", opacity: 0.7 }}>soon</span>}
    </Link>
  );
}

export default function GuideSidebar() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "8px 0" }}>

      {/* Overview */}
      <div>
        <NavItem
          href="/guide"
          label="Overview"
          icon="📖"
          isActive={pathname === "/guide"}
        />
      </div>

      {/* Workflows */}
      <div>
        <div
          style={{
            fontSize: "var(--text-2xs)",
            textTransform: "uppercase",
            letterSpacing: "1.2px",
            fontWeight: "var(--font-bold)",
            color: "var(--color-text-dim)",
            padding: "0 10px",
            marginBottom: "4px",
          }}
        >
          Workflows
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {WORKFLOWS.map((w) => {
            const href = `/guide/workflows/${w.slug}`;
            return (
              <NavItem
                key={w.slug}
                href={href}
                label={w.title}
                icon={w.icon}
                isActive={pathname === href || pathname.startsWith(href + "/")}
              />
            );
          })}
        </div>
      </div>

      {/* Feature Reference */}
      <div>
        <div
          style={{
            fontSize: "var(--text-2xs)",
            textTransform: "uppercase",
            letterSpacing: "1.2px",
            fontWeight: "var(--font-bold)",
            color: "var(--color-text-dim)",
            padding: "0 10px",
            marginBottom: "4px",
          }}
        >
          Feature Reference
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {FEATURE_LINKS.map((link) => (
            <div key={link.href}>
              <NavItem
                href={link.href}
                label={link.label}
                icon={link.icon}
                isActive={pathname === link.href || (pathname.startsWith(link.href + "/") && !link.soon)}
                isComingSoon={link.soon}
              />
              {/* Mobile sub-navigation */}
              {!link.soon && link.href === "/guide/features/mobile" && pathname.startsWith("/guide/features/mobile") && (
                <div style={{ marginLeft: "20px", marginTop: "2px", display: "flex", flexDirection: "column", gap: "1px" }}>
                  {MOBILE_SCREENS.map((s) => {
                    const href = `/guide/features/mobile/${s.slug}`;
                    return (
                      <NavItem key={s.slug} href={href} label={s.title} icon="" isActive={pathname === href} />
                    );
                  })}
                </div>
              )}
              {/* PWA sub-navigation */}
              {!link.soon && link.href === "/guide/features/pwa" && pathname.startsWith("/guide/features/pwa") && (
                <div style={{ marginLeft: "20px", marginTop: "2px", display: "flex", flexDirection: "column", gap: "1px" }}>
                  {PWA_SCREENS.map((s) => {
                    const href = `/guide/features/pwa/${s.slug}`;
                    return (
                      <NavItem
                        key={s.slug}
                        href={href}
                        label={s.title}
                        icon=""
                        isActive={pathname === href}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <NavItem
          href="/guide/faq"
          label="FAQ"
          icon="❓"
          isActive={pathname === "/guide/faq"}
        />
      </div>
    </nav>
  );
}
