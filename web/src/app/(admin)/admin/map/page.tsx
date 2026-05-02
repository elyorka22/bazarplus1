import dynamic from "next/dynamic";

const AdminCourierMapPage = dynamic(
  () => import("@/components/admin/admin-courier-map-page"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-neutral-500">
        Loading map…
      </div>
    ),
  },
);

export default function AdminMapPage() {
  return <AdminCourierMapPage />;
}
