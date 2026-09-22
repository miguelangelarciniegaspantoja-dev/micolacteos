import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RegistrationWizard from '@/components/RegistrationWizard';

export const metadata = {
  title: 'Registro de Beneficios | Mi Colacteos',
};

export default function RegistroPage() {
  return (
    <>
      <Header />
      <main>
        <RegistrationWizard />
      </main>
      <Footer />
    </>
  );
}
