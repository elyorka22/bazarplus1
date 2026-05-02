import { Header } from "@/components/layout/header";
import { HomePage } from "@/components/pages/home-page";

/**
 * Root `/` route lives here (not only under `app/(public)/`) so `next dev`
 * always resolves the homepage — avoids sporadic 404 when watchers miss route groups.
 */
export default function Page() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pb-10">
        <HomePage />
      </main>
    </>
  );
}
