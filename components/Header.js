import Link from 'next/link';

export default function Header() {
  return (
    <header className="min-h-[52px] bg-[#1d3064] px-0 py-1.5 text-white shadow-sm">
      <div className="mx-auto flex max-w-[1180px] items-center px-[22px]">
        <Link href="/registro" className="flex items-center gap-1.5 no-underline">
          <span className="text-[18px] font-bold tracking-[0.2px] text-white">Mi Colacteos</span>
        </Link>
      </div>
    </header>
  );
}
