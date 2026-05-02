import { Header } from "@/components/layout/header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pb-10">{children}</main>
    </>
  );
}
