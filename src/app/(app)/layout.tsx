import TopNavBar from "@/components/TopNavBar";
import AppInit from "@/components/AppInit";
import InstallBanner from "@/components/InstallBanner";
import UpdateBanner from "@/components/UpdateBanner";
import UndoToastHost from "@/components/UndoToastHost";

export default function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AppInit />
      <TopNavBar />
      <main id="main-content" style={{ paddingBottom: "var(--mobile-tabbar-h)" }}>{children}</main>
      <UpdateBanner />
      <UndoToastHost />
      <InstallBanner />
    </>
  );
}
