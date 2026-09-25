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

export const ORGANIZATIONS = [
  'Colácteos',
  'SAGAN',
  'FENALCO Nariño',
  'Cámara de Comercio',
  'Gobernación de Nariño',
  'Policía Nacional',
  'Otra organización / No aplica',
];

export const CHAMBER_LOCATIONS = [
  'Pasto - Nariño',
  'Ipiales - Nariño',
  'Tumaco - Nariño',
  'Bogotá - Bogotá D.C.',
  'Medellín - Antioquia',
  'Cali - Valle del Cauca',
  'Barranquilla - Atlántico',
  'Cartagena - Bolívar',
  'Bucaramanga - Santander',
  'Cúcuta - Norte de Santander',
  'Pereira - Risaralda',
  'Manizales - Caldas',
  'Armenia - Quindío',
  'Popayán - Cauca',
  'Neiva - Huila',
  'Ibagué - Tolima',
  'Tunja - Boyacá',
  'Villavicencio - Meta',
  'Santa Marta - Magdalena',
  'Valledupar - Cesar',
  'Montería - Córdoba',
  'Sincelejo - Sucre',
  'Riohacha - La Guajira',
  'Florencia - Caquetá',
  'Yopal - Casanare',
  'Quibdó - Chocó',
  'Arauca - Arauca',
  'Mocoa - Putumayo',
  'San José del Guaviare - Guaviare',
  'Leticia - Amazonas',
  'Mitú - Vaupés',
  'Inírida - Guainía',
  'Puerto Carreño - Vichada',
  'San Andrés - San Andrés, Providencia y Santa Catalina',
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

export const ROAD_SUFFIXES = [
  'Bis',
  'Este',
  'Oeste',
  'Norte',
  'Sur',
];

const MAX_LENGTHS = {
  fullName: 180,
  documentNumber: 40,
  phone: 15,
  email: 254,
  preferredContactChannel: 120,

  organization: 80,
  otherOrganization: 180,
  chamberLocation: 180,

  placeName: 180,
  divisionName: 180,

  roadNumber: 40,
  secondaryNumber: 40,
  addressExtra: 180,
};

export function normalizeSpaces(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Convierte:
 *
 * Pasto - Nariño
 *
 * en:
 *
 * {
 *   city: 'Pasto',
 *   department: 'Nariño'
 * }
 */
export function parseChamberLocation(value) {
  const normalized = normalizeSpaces(value);

  const separator =
    normalized.lastIndexOf(' - ');

  if (separator === -1) {
    return {
      city: '',
      department: '',
    };
  }

  return {
    city: normalizeSpaces(
      normalized.slice(
        0,
        separator,
      ),
    ),

    department: normalizeSpaces(
      normalized.slice(
        separator + 3,
      ),
    ),
  };
}

/**
 * Construye la dirección completa.
 */
export function buildFullAddress(form) {
  const road = [
    normalizeSpaces(form.roadType),
    normalizeSpaces(form.roadNumber),
    normalizeSpaces(form.roadSuffix),
  ]
    .filter(Boolean)
    .join(' ');

  const primary =
    road &&
    normalizeSpaces(
      form.secondaryNumber,
    )
      ? `${road} # ${normalizeSpaces(
          form.secondaryNumber,
        )}`
      : road;

  const parts = [];

  if (primary) {
    parts.push(primary);
  }

  if (
    normalizeSpaces(
      form.addressExtra,
    )
  ) {
    parts.push(
      normalizeSpaces(
        form.addressExtra,
      ),
    );
  }

  if (
    normalizeSpaces(
      form.placeName,
    )
  ) {
    parts.push(
      `${
        form.zoneType === 'Vereda'
          ? 'Vereda'
          : 'Barrio'
      } ${normalizeSpaces(
        form.placeName,
      )}`,
    );
  }

  if (!parts.length) {
    return '';
  }

  return `${parts.join(
    ', ',
  )}, Pasto, Nariño, Colombia`;
}

/**
 * Valida todos los campos del formulario.
 *
 * Esta validación se utiliza tanto desde
 * el navegador como desde la API.
 */
export function validateRegistration(
  form,
) {
  const errors = {};

  const required = {
    fullName:
      'Nombre completo',

    documentType:
      'Tipo de documento',

    documentNumber:
      'Número de documento',

    phone:
      'Celular o teléfono',

    email:
      'Correo electrónico',

    organization:
      'Dependencia, entidad u organización',

    zoneType:
      'Tipo de zona',

    placeName:
      'Barrio o vereda',

    roadType:
      'Tipo de vía',

    roadNumber:
      'Número de vía',

    secondaryNumber:
      'Número siguiente',
  };

  /**
   * Campos obligatorios.
   */
  for (
    const [field, label]
    of Object.entries(required)
  ) {
    if (
      !normalizeSpaces(
        form[field],
      )
    ) {
      errors[field] =
        `${label} es obligatorio.`;
    }
  }

  /**
   * Teléfono.
   */
  if (
    normalizeSpaces(form.phone) &&
    !/^\d{7,15}$/.test(
      String(
        form.phone,
      ).replace(/\D/g, ''),
    )
  ) {
    errors.phone =
      'Escribe un teléfono válido de 7 a 15 dígitos.';
  }

  /**
   * Correo.
   */
  if (
    normalizeSpaces(
      form.email,
    ) &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizeSpaces(
        form.email,
      ),
    )
  ) {
    errors.email =
      'Escribe un correo electrónico válido.';
  }

  /**
   * Documento.
   */
  if (
    normalizeSpaces(
      form.documentNumber,
    ) &&
    !/^\d+$/.test(
      normalizeSpaces(
        form.documentNumber,
      ),
    )
  ) {
    errors.documentNumber =
      'El número de documento solo debe contener dígitos.';
  }

  /**
   * Tipo de documento.
   */
  if (
    normalizeSpaces(
      form.documentType,
    ) &&
    !DOCUMENT_TYPES.includes(
      normalizeSpaces(
        form.documentType,
      ),
    )
  ) {
    errors.documentType =
      'Selecciona un tipo de documento válido.';
  }

  /**
   * Organización.
   */
  const organization =
    normalizeSpaces(
      form.organization,
    );

  if (
    organization &&
    !ORGANIZATIONS.includes(
      organization,
    )
  ) {
    errors.organization =
      'Selecciona una opción válida.';
  }

  /**
   * "Otra organización / No aplica".
   *
   * El nombre es OPCIONAL.
   */
  if (
    organization ===
    'Otra organización / No aplica'
  ) {
    const otherOrganization =
      normalizeSpaces(
        form.otherOrganization,
      );

    if (
      otherOrganization.length >
      MAX_LENGTHS.otherOrganization
    ) {
      errors.otherOrganization =
        `El campo supera el máximo permitido de ${MAX_LENGTHS.otherOrganization} caracteres.`;
    }
  }

  /**
   * Cámara de Comercio.
   *
   * La ciudad y departamento
   * sí son obligatorios.
   */
  if (
    organization ===
    'Cámara de Comercio'
  ) {
    const chamberLocation =
      normalizeSpaces(
        form.chamberLocation,
      );

    if (!chamberLocation) {
      errors.chamberLocation =
        'Selecciona la ciudad y el departamento de la Cámara de Comercio.';
    } else if (
      !CHAMBER_LOCATIONS.includes(
        chamberLocation,
      )
    ) {
      errors.chamberLocation =
        'Selecciona una ubicación válida para la Cámara de Comercio.';
    }
  }

  /**
   * Tipo de zona.
   */
  if (
    normalizeSpaces(
      form.zoneType,
    ) &&
    ![
      'Barrio',
      'Vereda',
    ].includes(
      normalizeSpaces(
        form.zoneType,
      ),
    )
  ) {
    errors.zoneType =
      'Selecciona un tipo de zona válido.';
  }

  /**
   * Tipo de vía.
   */
  if (
    normalizeSpaces(
      form.roadType,
    ) &&
    !ROAD_TYPES.includes(
      normalizeSpaces(
        form.roadType,
      ),
    )
  ) {
    errors.roadType =
      'Selecciona un tipo de vía válido.';
  }

  /**
   * Sufijo.
   */
  if (
    normalizeSpaces(
      form.roadSuffix,
    ) &&
    !ROAD_SUFFIXES.includes(
      normalizeSpaces(
        form.roadSuffix,
      ),
    )
  ) {
    errors.roadSuffix =
      'Selecciona un sufijo válido.';
  }

  /**
   * Medio de contacto.
   */
  if (
    form.commercialAuthorized &&
    normalizeSpaces(
      form.preferredContactChannel,
    )
  ) {
    const channel =
      normalizeSpaces(
        form.preferredContactChannel,
      );

    const validCustomChannel =
      channel.startsWith(
        'Otro: ',
      ) &&
      channel.length >
        'Otro: '.length;

    if (
      !CONTACT_CHANNELS.includes(
        channel,
      ) &&
      !validCustomChannel
    ) {
      errors.preferredContactChannel =
        'Selecciona un medio de contacto válido.';
    }
  }

  /**
   * Fecha de nacimiento.
   */
  if (
    normalizeSpaces(
      form.birthDate,
    )
  ) {
    const value =
      normalizeSpaces(
        form.birthDate,
      );

    const date =
      /^\d{4}-\d{2}-\d{2}$/.test(
        value,
      )
        ? new Date(
            `${value}T00:00:00Z`,
          )
        : null;

    if (
      !date ||
      Number.isNaN(
        date.getTime(),
      ) ||
      date
        .toISOString()
        .slice(0, 10) !== value
    ) {
      errors.birthDate =
        'Escribe una fecha de nacimiento válida.';
    } else if (
      date > new Date()
    ) {
      errors.birthDate =
        'La fecha de nacimiento no puede estar en el futuro.';
    }
  }

  /**
   * Longitudes máximas.
   */
  for (
    const [field, max]
    of Object.entries(
      MAX_LENGTHS,
    )
  ) {
    if (
      normalizeSpaces(
        form[field],
      ).length > max
    ) {
      errors[field] =
        `El campo supera el máximo permitido de ${max} caracteres.`;
    }
  }

  /**
   * Autorización de datos.
   */
  if (
    !form.dataProcessingAuthorized
  ) {
    errors.dataProcessingAuthorized =
      'La autorización de tratamiento de datos es necesaria para continuar.';
  }

  /**
   * Canal comercial.
   */
  if (
    form.commercialAuthorized &&
    !normalizeSpaces(
      form.preferredContactChannel,
    )
  ) {
    errors.preferredContactChannel =
      'Selecciona el medio de contacto preferido.';
  }

  /**
   * Dirección.
   */
  if (
    !buildFullAddress(form)
  ) {
    errors.fullAddress =
      'La dirección es obligatoria.';
  }

  return errors;
}