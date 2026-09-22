import Link from 'next/link';
import Header from '@/components/Header';

export const metadata = {
  title: 'Registro completado | Mi Colacteos',
};

export default function GraciasPage() {
  return (
    <>
      <Header />
      <main className="c-thanks overflow-hidden text-white">
        <div className="mx-auto grid min-h-[620px] max-w-[1180px] grid-cols-1 items-center gap-4 px-6 pb-0 pt-16 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,.95fr)] md:px-[30px] md:pb-7 md:pt-11">
          <div className="relative z-10 text-center">
            <span className="mb-8 inline-flex h-[86px] w-[86px] items-center justify-center rounded-full bg-[#0875cb] text-5xl font-light shadow-[0_12px_30px_rgba(7,28,70,.16)] md:mb-12">✓</span>
            <h1 className="mx-auto mb-[18px] max-w-[670px] text-[30px] font-extrabold leading-tight text-white md:text-[clamp(28px,3vw,39px)]">Este proceso se completó correctamente.</h1>
            <p className="mb-8 text-lg text-white md:mb-12">¡Gracias! Tu registro quedó guardado.</p>
            <Link href="/registro" className="inline-block rounded-lg bg-[#0875cb] px-[25px] py-[15px] text-[17px] font-bold text-white no-underline shadow-[0_7px_16px_rgba(8,23,58,.18)] hover:bg-[#0063b1]">Nuevo registro</Link>
          </div>
          <div className="self-end text-center leading-none">
            <img src="/vaca-senalar.png" alt="Vaca Colácteos señalando el registro completado" className="inline-block h-[min(490px,100vw)] w-auto max-w-full object-contain object-bottom md:h-[min(570px,62vw)]" />
          </div>
        </div>
      </main>
    </>
  );
}
