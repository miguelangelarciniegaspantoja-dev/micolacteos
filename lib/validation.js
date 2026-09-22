export const DOCUMENT_TYPES = [
  'Cédula de ciudadanía',
  'Tarjeta de identidad',
  'Cédula de extranjería',
  'NIT',
  'Pasaporte',
];

export const CONTACT_CHANNELS = [
  'WhatsApp',
  'Correo electrónico',
  'SMS',
  'Llamada telefónica',
  'Otro',
];

export const ROAD_TYPES = [
  'Calle',
  'Carrera',
  'Avenida',
  'Diagonal',
  'Transversal',
  'Autopista',
  'Ruta',
  'Vereda',
];

export const ROAD_SUFFIXES = ['Bis', 'Este', 'Oeste', 'Norte', 'Sur'];


const MAX_LENGTHS = {
  fullName: 180,
  documentNumber: 40,
  phone: 15,
  email: 254,
  preferredContactChannel: 120,
  placeName: 180,
  divisionName: 180,
  roadNumber: 40,
  secondaryNumber: 40,
  addressExtra: 180,
};

export function normalizeSpaces(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function buildFullAddress(form) {
  const road = [
    normalizeSpaces(form.roadType),
    normalizeSpaces(form.roadNumber),
    normalizeSpaces(form.roadSuffix),
  ].filter(Boolean).join(' ');

  const primary = road && normalizeSpaces(form.secondaryNumber)
    ? `${road} # ${normalizeSpaces(form.secondaryNumber)}`
    : road;

  const parts = [];
  if (primary) parts.push(primary);
  if (normalizeSpaces(form.addressExtra)) parts.push(normalizeSpaces(form.addressExtra));
  if (normalizeSpaces(form.placeName)) {
    parts.push(`${form.zoneType === 'Vereda' ? 'Vereda' : 'Barrio'} ${normalizeSpaces(form.placeName)}`);
  }

  if (!parts.length) return '';
  return `${parts.join(', ')}, Pasto, Nariño, Colombia`;
}

export function validateRegistration(form) {
  const errors = {};
  const required = {
    fullName: 'Nombre completo',
    documentType: 'Tipo de documento',
    documentNumber: 'Número de documento',
    phone: 'Celular o teléfono',
    email: 'Correo electrónico',
    zoneType: 'Tipo de zona',
    placeName: 'Barrio o vereda',
    roadType: 'Tipo de vía',
    roadNumber: 'Número de vía',
    secondaryNumber: 'Número siguiente',
  };

  for (const [field, label] of Object.entries(required)) {
    if (!normalizeSpaces(form[field])) errors[field] = `${label} es obligatorio.`;
  }

  if (normalizeSpaces(form.phone) && !/^\d{7,15}$/.test(String(form.phone).replace(/\D/g, ''))) {
    errors.phone = 'Escribe un teléfono válido de 7 a 15 dígitos.';
  }

  if (normalizeSpaces(form.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeSpaces(form.email))) {
    errors.email = 'Escribe un correo electrónico válido.';
  }

  if (normalizeSpaces(form.documentNumber) && !/^\d+$/.test(normalizeSpaces(form.documentNumber))) {
    errors.documentNumber = 'El número de documento solo debe contener dígitos.';
  }

  if (normalizeSpaces(form.documentType) && !DOCUMENT_TYPES.includes(normalizeSpaces(form.documentType))) {
    errors.documentType = 'Selecciona un tipo de documento válido.';
  }

  if (normalizeSpaces(form.zoneType) && !['Barrio', 'Vereda'].includes(normalizeSpaces(form.zoneType))) {
    errors.zoneType = 'Selecciona un tipo de zona válido.';
  }

  if (normalizeSpaces(form.roadType) && !ROAD_TYPES.includes(normalizeSpaces(form.roadType))) {
    errors.roadType = 'Selecciona un tipo de vía válido.';
  }

  if (normalizeSpaces(form.roadSuffix) && !ROAD_SUFFIXES.includes(normalizeSpaces(form.roadSuffix))) {
    errors.roadSuffix = 'Selecciona un sufijo válido.';
  }

  if (form.commercialAuthorized && normalizeSpaces(form.preferredContactChannel)) {
    const channel = normalizeSpaces(form.preferredContactChannel);
    const validCustomChannel = channel.startsWith('Otro: ') && channel.length > 'Otro: '.length;
    if (!CONTACT_CHANNELS.includes(channel) && !validCustomChannel) {
      errors.preferredContactChannel = 'Selecciona un medio de contacto válido.';
    }
  }

  if (normalizeSpaces(form.birthDate)) {
    const value = normalizeSpaces(form.birthDate);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
    if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      errors.birthDate = 'Escribe una fecha de nacimiento válida.';
    } else if (date > new Date()) {
      errors.birthDate = 'La fecha de nacimiento no puede estar en el futuro.';
    }
  }

  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    if (normalizeSpaces(form[field]).length > max) {
      errors[field] = `El campo supera el máximo permitido de ${max} caracteres.`;
    }
  }

  if (!form.dataProcessingAuthorized) {
    errors.dataProcessingAuthorized = 'La autorización de tratamiento de datos es necesaria para continuar.';
  }

  if (form.commercialAuthorized && !normalizeSpaces(form.preferredContactChannel)) {
    errors.preferredContactChannel = 'Selecciona el medio de contacto preferido.';
  }

  if (!buildFullAddress(form)) errors.fullAddress = 'La dirección es obligatoria.';

  return errors;
}
