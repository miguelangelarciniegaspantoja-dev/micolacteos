import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildFullAddress, normalizeSpaces, validateRegistration } from '@/lib/validation';

export const runtime = 'nodejs';

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serverKey) return null;
  return createClient(url, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function verifyTurnstile(token, request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { success: true };
  if (!token) return { success: false };

  const formData = new FormData();
  formData.set('secret', secret);
  formData.set('response', token);

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim();
  if (ip) formData.set('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
    cache: 'no-store',
  });

  if (!response.ok) return { success: false };
  return response.json();
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Honeypot: bots often fill hidden fields.
    if (normalizeSpaces(body.website)) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const payload = {
      dataProcessingAuthorized: body.dataProcessingAuthorized === true,
      commercialAuthorized: body.commercialAuthorized === true,
      preferredContactChannel: normalizeSpaces(body.preferredContactChannel),
      fullName: normalizeSpaces(body.fullName),
      documentType: normalizeSpaces(body.documentType),
      documentNumber: normalizeSpaces(body.documentNumber),
      phone: String(body.phone ?? '').replace(/\D/g, ''),
      email: normalizeSpaces(body.email).toLowerCase(),
      birthDate: normalizeSpaces(body.birthDate),
      zoneType: normalizeSpaces(body.zoneType),
      placeName: normalizeSpaces(body.placeName),
      divisionName: normalizeSpaces(body.divisionName),
      roadType: normalizeSpaces(body.roadType),
      roadNumber: normalizeSpaces(body.roadNumber),
      roadSuffix: normalizeSpaces(body.roadSuffix),
      secondaryNumber: normalizeSpaces(body.secondaryNumber),
      addressExtra: normalizeSpaces(body.addressExtra),
      coordinates: body.coordinates && Number.isFinite(Number(body.coordinates.lat)) && Number.isFinite(Number(body.coordinates.lng))
        ? { lat: Number(body.coordinates.lat), lng: Number(body.coordinates.lng) }
        : null,
    };

    const validationErrors = validateRegistration(payload);
    if (payload.coordinates
      && (payload.coordinates.lat < -90 || payload.coordinates.lat > 90
        || payload.coordinates.lng < -180 || payload.coordinates.lng > 180)) {
      validationErrors.coordinates = 'Las coordenadas no son válidas.';
    }

    if (Object.keys(validationErrors).length) {
      return NextResponse.json(
        { error: 'Revisa la información del formulario.', fields: validationErrors },
        { status: 400 },
      );
    }

    const captcha = await verifyTurnstile(body.turnstileToken, request);
    if (!captcha.success) {
      return NextResponse.json({ error: 'El código de verificación no es válido. Intenta nuevamente.' }, { status: 400 });
    }

    const supabase = serverSupabase();
    if (!supabase) {
      console.error('Missing Supabase server environment variables.');
      return NextResponse.json({ error: 'El servicio de registro no está configurado.' }, { status: 500 });
    }

    const fullAddress = buildFullAddress(payload);
    const { error } = await supabase.from('benefit_registrations').insert({
      data_processing_authorized: true,
      commercial_communications_authorized: payload.commercialAuthorized,
      preferred_contact_channel: payload.preferredContactChannel || null,
      full_name: payload.fullName,
      document_type: payload.documentType,
      document_number: payload.documentNumber,
      phone: payload.phone,
      email: payload.email,
      birth_date: payload.birthDate || null,
      zone_type: payload.zoneType,
      place_name: payload.placeName,
      division_name: payload.divisionName || null,
      road_type: payload.roadType,
      road_number: payload.roadNumber,
      road_suffix: payload.roadSuffix || null,
      secondary_number: payload.secondaryNumber,
      address_extra: payload.addressExtra || null,
      full_address: fullAddress,
      city: 'Pasto',
      department: 'Nariño',
      country: 'Colombia',
      latitude: payload.coordinates?.lat ?? null,
      longitude: payload.coordinates?.lng ?? null,
      source: 'nextjs-vercel',
    });

    if (error) {
      console.error('Supabase insert error:', error.message);
      return NextResponse.json({ error: 'No fue posible guardar el registro. Intenta nuevamente.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }
}
