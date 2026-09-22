export default function Footer() {
  return (
    <footer className="mt-7 bg-[rgba(28,43,101,.96)] text-white">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-7 px-[22px] py-8 md:grid-cols-[1.2fr_1.3fr_1fr]">
        <div>
          <img src="/logoccc.png" alt="Colácteos" className="mb-3.5 w-[190px] max-w-full" />
          <p className="text-sm leading-relaxed text-white">Beneficios, experiencias y productos pensados para ti.</p>
        </div>
        <div>
          <h3 className="mb-3.5 text-[15px] font-bold tracking-[.04em] text-[#ffd13d]">CONTÁCTANOS</h3>
          <p className="my-2 text-sm leading-relaxed text-white">📍 CEDI Kilómetro 7.5 vía Pasto - Ipiales, sector Catambuco</p>
          <p className="my-2 text-sm"><a href="tel:+573125941403" className="text-white hover:underline">📞 +57 312 594 14 03</a></p>
          <p className="my-2 break-all text-sm"><a href="mailto:servicioalcliente@colacteos.com" className="text-white hover:underline">✉ servicioalcliente@colacteos.com</a></p>
        </div>
        <div>
          <h3 className="mb-3.5 text-[15px] font-bold tracking-[.04em] text-[#ffd13d]">SÍGUENOS EN REDES</h3>
          <div className="mt-4 flex gap-2.5">
            <Social href="https://www.facebook.com/ColacteosOficial/" label="Facebook">f</Social>
            <Social href="https://www.youtube.com/channel/UCGe5nO2muMF-JbH3Oz6394w" label="YouTube" extra="bg-[#e53935]">▶</Social>
            <Social href="https://www.instagram.com/colacteos" label="Instagram" extra="bg-[linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)]">◎</Social>
            <Social href="https://twitter.com/MColacteos" label="X" extra="bg-[#111]">𝕏</Social>
          </div>
        </div>
      </div>
      <div className="bg-[rgba(174,210,239,.95)] px-5 py-3 text-center text-sm text-[#172d63]">
        Colácteos 2026. Todos los derechos reservados.
      </div>
    </footer>
  );
}

function Social({ href, label, extra = 'bg-[#2862a7]', children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-white no-underline ${extra}`}
    >
      {children}
    </a>
  );
}
