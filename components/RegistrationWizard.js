'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import OsmMap from '@/components/OsmMap';
import TurnstileWidget from '@/components/TurnstileWidget';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { TERRITORIAL_CATALOG } from '@/lib/territorialCatalog';
import {
  CONTACT_CHANNELS,
  DOCUMENT_TYPES,
  ROAD_SUFFIXES,
  ROAD_TYPES,
  buildFullAddress,
  normalizeSpaces,
  validateRegistration,
} from '@/lib/validation';

const initialForm = {
  dataProcessingAuthorized: false,
  commercialAuthorized: false,
  preferredContactChannel: '',
  fullName: '',
  documentType: '',
  documentNumber: '',
  phone: '',
  email: '',
  birthDate: '',
  zoneType: '',
  placeName: '',
  divisionName: '',
  roadType: '',
  roadNumber: '',
  roadSuffix: '',
  secondaryNumber: '',
  addressExtra: '',
  coordinates: null,
  website: '',
};

function fallbackRows() {
  return Object.entries(TERRITORIAL_CATALOG).flatMap(([placeType, values]) =>
    Array.from(new Set(values)).map((placeName) => ({
      place_type: placeType,
      place_name: placeName,
      division_name: null,
    })),
  );
}

export default function RegistrationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [catalog, setCatalog] = useState(() => fallbackRows());
  const [catalogRemote, setCatalogRemote] = useState(false);
  const [treatmentChoice, setTreatmentChoice] = useState('');
  const [commercialChoice, setCommercialChoice] = useState('');
  const [channelChoice, setChannelChoice] = useState('');
  const [otherChannel, setOtherChannel] = useState('');
  const [errors, setErrors] = useState({});
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const onTurnstileToken = useCallback((token) => setTurnstileToken(token), []);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase
      .from('territorial_catalog')
      .select('place_type, place_name, division_name')
      .order('place_name', { ascending: true })
      .limit(1000)
      .then(({ data, error }) => {
        if (!active || error || !data?.length) return;
        setCatalog(data);
        setCatalogRemote(true);
      });

    return () => { active = false; };
  }, []);

  const matchingPlaces = useMemo(() => {
    const type = form.zoneType;
    if (!type) return [];
    const query = normalizeSpaces(form.placeName).toLocaleLowerCase('es');
    const seen = new Set();
    return catalog
      .filter((row) => row.place_type === type)
      .filter((row) => !query || row.place_name.toLocaleLowerCase('es').includes(query))
      .filter((row) => {
        const key = row.place_name.toLocaleLowerCase('es');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 100);
  }, [catalog, form.placeName, form.zoneType]);

  const totalForType = useMemo(
    () => catalog.filter((row) => row.place_type === form.zoneType).length,
    [catalog, form.zoneType],
  );

  const fullAddress = useMemo(() => buildFullAddress(form), [form]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field] && !current.fullAddress) return current;
      const next = { ...current };
      delete next[field];
      if (['roadType', 'roadNumber', 'secondaryNumber', 'placeName', 'zoneType'].includes(field)) delete next.fullAddress;
      return next;
    });
  }

  function chooseTreatment(value) {
    setTreatmentChoice(value);
    update('dataProcessingAuthorized', value === 'yes');
    setSummary('');
  }

  function continueTreatment() {
    if (!treatmentChoice) {
      setSummary('Selecciona si autorizas el tratamiento de datos personales.');
      return;
    }
    if (treatmentChoice === 'no') return;
    setSummary('');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function chooseCommercial(value) {
    setCommercialChoice(value);
    update('commercialAuthorized', value === 'yes');
    if (value === 'no') {
      setChannelChoice('');
      setOtherChannel('');
      update('preferredContactChannel', '');
    }
  }

  function continueCommercial() {
    if (!commercialChoice) {
      setSummary('Selecciona si autorizas las comunicaciones comerciales.');
      return;
    }

    if (commercialChoice === 'yes') {
      if (!channelChoice) {
        setSummary('Selecciona el medio de contacto preferido.');
        return;
      }
      if (channelChoice === 'Otro' && !normalizeSpaces(otherChannel)) {
        setSummary('Especifica el medio de contacto que prefieres.');
        return;
      }
      update('preferredContactChannel', channelChoice === 'Otro' ? `Otro: ${normalizeSpaces(otherChannel)}` : channelChoice);
    }

    setSummary('');
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onPlaceChange(value) {
    const placeName = value;
    const exact = catalog.find(
      (row) => row.place_type === form.zoneType && row.place_name.toLocaleLowerCase('es') === placeName.toLocaleLowerCase('es'),
    );
    setForm((current) => ({
      ...current,
      placeName,
      divisionName: exact?.division_name || '',
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.placeName;
      delete next.fullAddress;
      return next;
    });
  }

  async function submitRegistration() {
    const normalized = {
      ...form,
      phone: String(form.phone).replace(/\D/g, ''),
      fullName: normalizeSpaces(form.fullName),
      documentNumber: normalizeSpaces(form.documentNumber),
      email: normalizeSpaces(form.email),
      placeName: normalizeSpaces(form.placeName),
      divisionName: normalizeSpaces(form.divisionName),
      roadNumber: normalizeSpaces(form.roadNumber),
      secondaryNumber: normalizeSpaces(form.secondaryNumber),
      addressExtra: normalizeSpaces(form.addressExtra),
    };

    const foundErrors = validateRegistration(normalized);
    setErrors(foundErrors);

    if (Object.keys(foundErrors).length) {
      setSummary('Revisa los campos marcados en rojo. Completa los obligatorios y corrige los datos inválidos.');
      focusFirstError(foundErrors);
      return;
    }

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setSummary('Completa el código de verificación antes de continuar.');
      return;
    }

    setSubmitting(true);
    setSummary('');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...normalized, turnstileToken }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (result.fields && typeof result.fields === 'object') {
          setErrors(result.fields);
          focusFirstError(result.fields);
        }
        setSummary(result.error || 'No fue posible guardar el registro. Intenta nuevamente.');
        setSubmitting(false);
        return;
      }

      router.push('/gracias');
    } catch {
      setSummary('No fue posible conectar con el servidor. Revisa tu conexión e intenta nuevamente.');
      setSubmitting(false);
    }
  }

  function focusFirstError(foundErrors) {
    const ids = {
      fullName: 'fullName', documentType: 'documentType', documentNumber: 'documentNumber',
      phone: 'phone', email: 'email', birthDate: 'birthDate', zoneType: 'zoneType', placeName: 'placeName',
      roadType: 'roadType', roadNumber: 'roadNumber', secondaryNumber: 'secondaryNumber',
    };
    const first = Object.keys(foundErrors).find((key) => ids[key]);
    if (first) document.getElementById(ids[first])?.focus();
  }

  return (
    <section className="mx-auto max-w-[980px] px-[18px] pb-[70px] pt-[30px]">
      <div className="px-5 pb-[26px] pt-9 text-center">
        <img src="/logoccc.png" alt="Colácteos" className="mx-auto mb-5 block h-auto w-[min(280px,76vw)]" />
        <h1 className="mx-auto mb-3 max-w-[760px] text-[clamp(2rem,5vw,3.3rem)] font-extrabold leading-[1.1] text-white">Registro de Beneficios Colácteos</h1>
        <p className="mx-auto max-w-[760px] text-[1.05rem] leading-relaxed text-white">Queremos conocerte mejor para ofrecerte beneficios, experiencias y productos pensados para ti.</p>
      </div>

      <Progress step={step} />

      {step === 1 && (
        <WizardCard>
          <h2 className="mb-[18px] text-[clamp(1.35rem,3vw,2rem)] font-extrabold text-white">Autorización para el tratamiento de datos personales</h2>
          <p className="leading-relaxed text-[#f1f4ff]">Al diligenciar este formulario, autorizo de manera previa, expresa, libre e informada a la Cooperativa de Productos Lácteos de Nariño Ltda. – COLÁCTEOS para recolectar, almacenar, usar, actualizar y tratar los datos personales que suministre, con el fin de gestionar mi registro, validar mi vinculación cuando corresponda, facilitar el acceso a beneficios y descuentos, y comunicarme información relacionada con productos, promociones, eventos, actividades y servicios de COLÁCTEOS.</p>
          <p className="mt-4 leading-relaxed text-[#f1f4ff]">Declaro que he sido informado(a) de mis derechos como titular de los datos personales, entre ellos conocer, actualizar, rectificar y solicitar la supresión de mi información, así como revocar la autorización cuando sea procedente.</p>
          <p className="mt-4 leading-relaxed text-[#f1f4ff]">Consulta nuestra <a className="text-[#ffd331] underline" href="https://colacteos.com/politicas/" target="_blank" rel="noopener noreferrer">Política de Tratamiento de Datos Personales</a>.</p>
          <ChoiceRow name="treatment" value={treatmentChoice} onChange={chooseTreatment} />
          {treatmentChoice === 'no' && <div className="mt-5 border-l-4 border-[#ffd331] bg-[rgba(255,211,49,.12)] px-4 py-3 text-white">No podemos continuar con el registro sin esta autorización. Gracias por tu tiempo.</div>}
          <Summary text={summary} />
          <Actions><PrimaryButton onClick={continueTreatment}>Continuar</PrimaryButton></Actions>
        </WizardCard>
      )}

      {step === 2 && (
        <WizardCard>
          <h2 className="mb-[18px] text-[clamp(1.35rem,3vw,2rem)] font-extrabold text-white">Autorización para comunicaciones comerciales</h2>
          <p className="leading-relaxed text-[#f1f4ff]">Si lo deseas, también podemos enviarte información comercial, beneficios, promociones y novedades de COLÁCTEOS.</p>
          <ChoiceRow name="commercial" value={commercialChoice} onChange={chooseCommercial} />
          {commercialChoice === 'yes' && (
            <div className="mt-5">
              <FieldLabel label="Medio preferido" htmlFor="channelChoice">
                <select id="channelChoice" className="colacteos-input" value={channelChoice} onChange={(e) => { setChannelChoice(e.target.value); setSummary(''); }}>
                  <option value="">Selecciona un medio</option>
                  {CONTACT_CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}
                </select>
              </FieldLabel>
              {channelChoice === 'Otro' && (
                <FieldLabel label="Especifica otro medio" htmlFor="otherChannel">
                  <input id="otherChannel" className="colacteos-input" maxLength={100} value={otherChannel} onChange={(e) => setOtherChannel(e.target.value)} placeholder="Escribe el medio que prefieres" />
                </FieldLabel>
              )}
            </div>
          )}
          <Summary text={summary} />
          <Actions>
            <SecondaryButton onClick={() => { setStep(1); setSummary(''); }}>Atrás</SecondaryButton>
            <PrimaryButton onClick={continueCommercial}>Continuar</PrimaryButton>
          </Actions>
        </WizardCard>
      )}

      {step === 3 && (
        <WizardCard>
          <h2 className="mb-[18px] text-[clamp(1.35rem,3vw,2rem)] font-extrabold text-white">Completa tus datos</h2>
          <p className="mb-5 leading-relaxed text-[#f1f4ff]">Los campos marcados con * son obligatorios.</p>

          <div className="space-y-[18px]">
            <InputField id="fullName" label="Nombre completo *" value={form.fullName} onChange={(v) => update('fullName', v)} error={errors.fullName} autoComplete="name" />
            <SelectField id="documentType" label="Tipo de documento *" value={form.documentType} onChange={(v) => update('documentType', v)} error={errors.documentType} placeholder="Selecciona el tipo de documento" options={DOCUMENT_TYPES} />
            <InputField id="documentNumber" label="Número de documento *" value={form.documentNumber} onChange={(v) => update('documentNumber', v.replace(/\D/g, ''))} error={errors.documentNumber} inputMode="numeric" />
            <InputField id="phone" label="Celular o teléfono *" value={form.phone} onChange={(v) => update('phone', v.replace(/\D/g, ''))} error={errors.phone} inputMode="numeric" placeholder="Escribe solo números" autoComplete="tel" />
            <InputField id="email" label="Correo electrónico *" value={form.email} onChange={(v) => update('email', v)} error={errors.email} type="email" placeholder="nombre@correo.com" autoComplete="email" />
            <InputField id="birthDate" label="Fecha de nacimiento" value={form.birthDate} onChange={(v) => update('birthDate', v)} error={errors.birthDate} type="date" />
          </div>

          <div className="mt-7">
            <h3 className="mb-3 text-[1.1rem] font-bold text-white">Ubicación territorial</h3>
            <SelectField
              id="zoneType"
              label="Tipo de zona *"
              value={form.zoneType}
              onChange={(value) => {
                setForm((current) => ({ ...current, zoneType: value, placeName: '', divisionName: '' }));
                setErrors((current) => {
                  const next = { ...current };
                  delete next.zoneType;
                  delete next.placeName;
                  delete next.fullAddress;
                  return next;
                });
              }}
              error={errors.zoneType}
              placeholder="Selecciona"
              options={['Barrio', 'Vereda']}
            />
            <FieldLabel label="Barrio o vereda *" htmlFor="placeName">
              <input
                id="placeName"
                className={`colacteos-input ${errors.placeName ? 'colacteos-invalid' : ''}`}
                list="territorialPlaces"
                autoComplete="off"
                disabled={!form.zoneType}
                value={form.placeName}
                onChange={(e) => onPlaceChange(e.target.value)}
                placeholder={form.zoneType ? 'Escribe para filtrar opciones' : 'Selecciona primero el tipo de zona'}
              />
              <datalist id="territorialPlaces">
                {matchingPlaces.map((row) => <option key={`${row.place_type}-${row.place_name}`} value={row.place_name} />)}
              </datalist>
              {errors.placeName && <FieldError>{errors.placeName}</FieldError>}
            </FieldLabel>
            <p className="mt-2 text-sm text-[#dbe4ff]">
              {form.zoneType ? `${totalForType} opciones del catálogo. Escribe para filtrar.${catalogRemote ? '' : ' Usando catálogo local de respaldo.'}` : 'Selecciona un tipo de zona para ver el catálogo.'}
            </p>
            <div className="mt-2 rounded-lg bg-white px-3.5 py-3 font-semibold text-[#173462]">
              Comuna o corregimiento: {form.divisionName || 'se mostrará automáticamente cuando exista esa relación en el catálogo.'}
            </div>
          </div>

          <div className="mt-7">
            <h3 className="mb-3 text-[1.1rem] font-bold text-white">Construye tu dirección</h3>
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <SelectField id="roadType" label="Tipo de vía *" value={form.roadType} onChange={(v) => update('roadType', v)} error={errors.roadType} placeholder="Selecciona" options={ROAD_TYPES} />
              <InputField id="roadNumber" label="Número de vía *" value={form.roadNumber} onChange={(v) => update('roadNumber', v)} error={errors.roadNumber} placeholder="Ej. 12" />
              <SelectField id="roadSuffix" label="Sufijo" value={form.roadSuffix} onChange={(v) => update('roadSuffix', v)} placeholder="Sin sufijo" options={ROAD_SUFFIXES} />
              <InputField id="secondaryNumber" label="Número siguiente *" value={form.secondaryNumber} onChange={(v) => update('secondaryNumber', v)} error={errors.secondaryNumber} placeholder="Ej. 34-56" />
              <div className="md:col-span-2">
                <InputField id="addressExtra" label="Complemento o referencia (opcional)" value={form.addressExtra} onChange={(v) => update('addressExtra', v)} placeholder="Apartamento, casa, bloque, finca, referencia..." />
              </div>
            </div>
            <p className="mt-2 text-sm text-[#dbe4ff]">Ejemplo: Carrera 12 Bis # 34-56, Casa 2.</p>
            <FieldLabel label="Dirección completa" htmlFor="fullAddress">
              <input id="fullAddress" className={`colacteos-input ${errors.fullAddress ? 'colacteos-invalid' : ''}`} readOnly value={fullAddress} />
              {errors.fullAddress && <FieldError>{errors.fullAddress}</FieldError>}
            </FieldLabel>
          </div>

          <details className="mt-7 rounded-xl border border-white/20 bg-white/5 p-4">
            <summary className="cursor-pointer font-bold text-white">Seleccionar ubicación en OpenStreetMap (opcional)</summary>
            <p className="mt-3 text-sm leading-relaxed text-[#f1f4ff]">Haz clic en el punto aproximado donde vives o usa la ubicación del dispositivo. La dirección escrita es suficiente para registrar el formulario.</p>
            <OsmMap value={form.coordinates} onChange={(coordinates) => update('coordinates', coordinates)} />
          </details>

          <div className="sr-only" aria-hidden="true">
            <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update('website', e.target.value)} /></label>
          </div>

          <TurnstileWidget onToken={onTurnstileToken} />
          <Summary text={summary} />

          <Actions>
            <SecondaryButton onClick={() => { setStep(2); setSummary(''); }}>Atrás</SecondaryButton>
            <PrimaryButton onClick={submitRegistration} disabled={submitting}>{submitting ? 'Guardando...' : 'Continuar'}</PrimaryButton>
          </Actions>
        </WizardCard>
      )}
    </section>
  );
}

function Progress({ step }) {
  return (
    <div className="mx-auto mb-6 mt-3 flex items-center justify-center gap-2.5" aria-label={`Paso ${step} de 3`}>
      {[1, 2, 3].map((number, index) => (
        <div key={number} className="contents">
          {index > 0 && <i className="h-0.5 w-[54px] bg-[#8292cf]" />}
          <span className={`grid h-8 w-8 place-items-center rounded-full border-2 font-bold ${number <= step ? 'border-[#ffd331] bg-[#ffd331] text-[#13275f]' : 'border-[#8292cf] text-[#cbd4f6]'}`}>{number}</span>
        </div>
      ))}
    </div>
  );
}

function WizardCard({ children }) {
  return <div className="rounded-2xl border border-white/20 bg-[rgba(17,33,89,.82)] px-5 py-[30px] shadow-[0_18px_40px_rgba(0,0,0,.2)] sm:px-[clamp(20px,5vw,52px)]">{children}</div>;
}

function ChoiceRow({ name, value, onChange }) {
  return (
    <div className="my-6 flex flex-wrap gap-[18px]">
      <Choice name={name} value="yes" checked={value === 'yes'} onChange={onChange}>Sí, autorizo</Choice>
      <Choice name={name} value="no" checked={value === 'no'} onChange={onChange}>No autorizo</Choice>
    </div>
  );
}

function Choice({ name, value, checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 font-semibold text-white">
      <input className="h-[22px] w-[22px] accent-[#0d8eea]" type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      {children}
    </label>
  );
}

function FieldLabel({ label, htmlFor, children }) {
  return <label htmlFor={htmlFor} className="mt-2 block font-bold leading-snug text-white">{label}{children}</label>;
}

function InputField({ id, label, value, onChange, error, type = 'text', ...props }) {
  return (
    <FieldLabel label={label} htmlFor={id}>
      <input id={id} type={type} className={`colacteos-input ${error ? 'colacteos-invalid' : ''}`} value={value} onChange={(e) => onChange(e.target.value)} {...props} />
      {error && <FieldError>{error}</FieldError>}
    </FieldLabel>
  );
}

function SelectField({ id, label, value, onChange, error, placeholder, options }) {
  return (
    <FieldLabel label={label} htmlFor={id}>
      <select id={id} className={`colacteos-input ${error ? 'colacteos-invalid' : ''}`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      {error && <FieldError>{error}</FieldError>}
    </FieldLabel>
  );
}

function FieldError({ children }) {
  return <span className="mt-1 block text-sm font-semibold text-[#ffd8d8]">{children}</span>;
}

function Summary({ text }) {
  if (!text) return null;
  return <div role="alert" className="mt-4 rounded-[10px] bg-[#fff3cd] px-[15px] py-[13px] font-bold leading-relaxed text-[#542d00]">{text}</div>;
}

function Actions({ children }) {
  return <div className="mt-6 flex flex-wrap justify-end gap-3 max-sm:[&>button]:flex-1">{children}</div>;
}

function PrimaryButton({ children, disabled, ...props }) {
  return <button type="button" disabled={disabled} className="rounded-lg border-0 bg-[#0d8eea] px-6 py-3 font-bold text-white shadow-[0_6px_14px_rgba(0,0,0,.18)] transition hover:bg-[#34a8f2] disabled:cursor-not-allowed disabled:opacity-60" {...props}>{children}</button>;
}

function SecondaryButton({ children, ...props }) {
  return <button type="button" className="rounded-lg border border-[#9db3f0] bg-transparent px-6 py-3 font-bold text-white" {...props}>{children}</button>;
}
