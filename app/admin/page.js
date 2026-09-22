import Header from '@/components/Header';
import AdminDashboard from '@/components/AdminDashboard';

export const metadata = {
  title: 'Administración | Mi Colacteos',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <Header />
      <main className="mx-auto min-h-[calc(100vh-52px)] max-w-[1180px] px-5 py-10">
        <AdminDashboard />
      </main>
    </>
  );
}
