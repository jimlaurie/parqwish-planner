import TopNavBar from "@/components/TopNavBar";
import AppInit from "@/components/AppInit";
import InstallBanner from "@/components/InstallBanner";
import UpdateBanner from "@/components/UpdateBanner";

export default function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AppInit />
      <TopNavBar />
      <main id="main-content">{children}</main>
      <UpdateBanner />
      <InstallBanner />
    </>
  );
}
