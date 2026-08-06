import SidebarLayout from "@/components/SidebarLayout";
import GuideSidebar from "@/components/guide/GuideSidebar";

export const metadata = {
  title: "Guide — ParQwish",
  description: "Step-by-step workflows and feature reference for ParQwish Planner and ParQwish Pal.",
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout sidebar={<GuideSidebar />} sidebarWidth={220}>
      <div style={{ padding: "24px 24px 48px", maxWidth: "860px" }}>
        {children}
      </div>
    </SidebarLayout>
  );
}
