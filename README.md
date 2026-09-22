# Mi Colacteos — migración Power Pages → Next.js

Reescritura de la aplicación exportada en `AKI.zip` para ejecutarse como una aplicación desacoplada en **Next.js + React + Tailwind CSS**, desplegable en **Vercel**, con **Supabase** como base de datos y autenticación administrativa y **OpenStreetMap** para la selección opcional de ubicación.

## Qué se migró

- Flujo de 3 pasos del registro original.
- Autorización obligatoria de tratamiento de datos.
- Autorización opcional de comunicaciones comerciales y canal preferido.
- Datos personales y validaciones del formulario.
- Catálogo territorial de respaldo extraído de la exportación: 555 valores originales (411 barrios y 144 veredas), depurados a 542 nombres únicos (407 barrios y 135 veredas).
- Constructor de dirección con Pasto, Nariño, Colombia.
- Pantalla de confirmación con los recursos gráficos originales.
- Header, colores, tipografía Montserrat y footer corporativo.
- CAPTCHA: reemplazo del CAPTCHA propietario de Power Pages por Cloudflare Turnstile, opcional en desarrollo y recomendado/activable en producción.
- OpenStreetMap mediante Leaflet, sin Azure Maps.
- Persistencia en Supabase.
- Panel `/admin` protegido por Supabase Auth + RLS.
- Exportación de registros a Excel (`.xlsx`) con SheetJS 0.20.3 desde su distribución oficial.

> Nota del catálogo territorial: la exportación contenía los nombres locales de barrios/veredas, pero no contenía las filas remotas de Dataverse que relacionaban cada lugar con su comuna/corregimiento. Por eso `division_name` queda preparado en Supabase y el formulario lo completa automáticamente cuando esa relación exista en la tabla. No se inventaron relaciones faltantes.

## 1. Requisitos

- Node.js 22 (incluido en `.nvmrc`).
- npm.
- Proyecto en Supabase.
- Cuenta de Vercel para producción.
- Opcional/recomendado: widget gratuito de Cloudflare Turnstile.

## 2. Instalar dependencias

```bash
npm install
```

Ejecutar localmente:

```bash
npm run dev
```

Abrir:

```text
http://localhost:3000/registro
```

Panel administrativo:

```text
http://localhost:3000/admin
```

## 3. Preparar Supabase

En **Supabase → SQL Editor**:

1. Ejecuta `supabase/schema.sql`.
2. Ejecuta `supabase/seed.sql`.

El primer archivo crea:

- `benefit_registrations`: registros del formulario.
- `territorial_catalog`: barrios/veredas y su futura relación de comuna/corregimiento.
- `app_admins`: lista de usuarios autorizados para ver/exportar registros.
- índices, RLS, función `is_app_admin()` y permisos mínimos.

El formulario público **no puede leer los registros personales** y tampoco inserta directamente con la llave pública. El endpoint `/api/register` valida los datos/CAPTCHA y realiza el insert exclusivamente desde el servidor con `SUPABASE_SECRET_KEY` (o `service_role` legacy como respaldo).

## 4. Variables de entorno

Copia:

```bash
cp .env.example .env.local
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Configura:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_PUBLISHABLE_O_ANON_KEY
SUPABASE_SECRET_KEY=sb_secret_TU_CLAVE_PRIVADA

# Solo para proyectos legacy si todavía no tienen Secret Key nueva:
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

Dónde encontrarlas en Supabase:

- URL del proyecto: **Project Settings → API**.
- Publishable key: llave pública recomendada para el navegador. Si tu proyecto aún usa claves legacy, puedes colocar el `anon key` en la misma variable pública.
- Secret key: llave privada recomendada para el servidor. Si tu proyecto aún es legacy, puedes usar `SUPABASE_SERVICE_ROLE_KEY` como respaldo. **Nunca** expongas una Secret Key o Service Role con prefijo `NEXT_PUBLIC_` ni la subas a Git.

## 5. Crear el usuario administrador

Primero crea un usuario de correo/contraseña en **Supabase → Authentication → Users**.

Luego ejecuta en SQL Editor, cambiando el correo:

```sql
insert into public.app_admins (user_id)
select id
from auth.users
where email = 'admin@tu-dominio.com'
on conflict (user_id) do nothing;
```

Ese usuario podrá iniciar sesión en `/admin`, consultar los registros por RLS y exportarlos a Excel.

## 6. CAPTCHA / Turnstile

La exportación original de Power Pages exigía CAPTCHA. Para conservar esa protección en producción:

1. Crea un widget en Cloudflare Turnstile.
2. Configura el dominio de Vercel y/o dominio definitivo.
3. Copia el Site Key a `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
4. Copia el Secret Key a `TURNSTILE_SECRET_KEY`.

Si esas variables quedan vacías, la aplicación funciona sin Turnstile (útil para desarrollo local), pero mantiene un honeypot básico. Para producción pública se recomienda configurar ambas.

## 7. OpenStreetMap

El mapa es opcional y usa Leaflet con los tiles estándar de OpenStreetMap. Solo se cargan las teselas visibles de un mapa interactivo y se conserva la atribución a OpenStreetMap. No se implementa descarga masiva ni precarga de mapas.

La ubicación puede seleccionarse haciendo clic en el mapa o usando `navigator.geolocation` del navegador. El registro puede enviarse sin coordenadas, igual que la versión final del Power Pages, donde el mapa había terminado oculto por parches posteriores.

## 8. Probar producción local

```bash
npm run build
npm start
```

## 9. Desplegar en Vercel

Con Vercel CLI:

```bash
npm install -g vercel
vercel login
vercel
```

Luego añade en **Vercel → Project → Settings → Environment Variables** las mismas variables de `.env.local`.

Para producción:

```bash
vercel --prod
```

También puedes subir este proyecto a GitHub/GitLab/Bitbucket e importarlo desde Vercel.

## 10. Estructura principal

```text
app/
  api/register/route.js      API segura para guardar el formulario
  admin/page.js              Panel administrativo
  gracias/page.js            Confirmación del registro
  registro/page.js           Formulario principal
components/
  AdminDashboard.js
  Footer.js
  Header.js
  OsmMap.js
  RegistrationWizard.js
  TurnstileWidget.js
lib/
  supabaseBrowser.js
  territorialCatalog.js
  validation.js
public/
  favicon-vaca-colacteos.png
  fondo.png
  logoccc.png
  vaca-senalar.png
supabase/
  schema.sql
  seed.sql
```

## 11. Seguridad aplicada

- RLS habilitado en las tablas sensibles.
- El usuario anónimo no puede hacer `SELECT` de `benefit_registrations`.
- El usuario anónimo tampoco tiene `INSERT` directo sobre esa tabla.
- Los inserts públicos pasan por un Route Handler de Next.js.
- `SUPABASE_SECRET_KEY` —o `SUPABASE_SERVICE_ROLE_KEY` en proyectos legacy— solo se usa en servidor.
- Los administradores se verifican contra `app_admins` y RLS.
- Validación doble: cliente y servidor.
- CAPTCHA Turnstile disponible para producción.
- Campo honeypot anti-bot adicional.
- No se guardan contraseñas en tablas propias; se usa Supabase Auth.

## 12. Actualizar comuna/corregimiento

Cuando tengas el catálogo oficial con la relación exacta, actualiza `territorial_catalog.division_name`. El formulario ya está preparado para mostrarla automáticamente al seleccionar una coincidencia exacta.

Ejemplo:

```sql
update public.territorial_catalog
set division_name = 'Comuna 1'
where place_type = 'Barrio'
  and place_name = 'Centro';
```

No es necesario cambiar el frontend.

## 13. Mapeo Dataverse → Supabase

La migración conserva la intención de los campos originales de `cr904_registrobeneficioscolacteos`:

| Dataverse / Power Pages | Supabase |
|---|---|
| `cr904_autorizaciontratamientodedatos` | `data_processing_authorized` |
| `cr904_autorizaciondecomunicacionescomerciales` | `commercial_communications_authorized` |
| `cr904_canaldecontactopreferido` | `preferred_contact_channel` |
| `cr904_nombrecompleto` | `full_name` |
| `cr904_tipodedocumento` | `document_type` |
| `cr904_numerodedocumento` | `document_number` |
| `cr904_celularonumerotelefonico` | `phone` |
| `cr904_correoelectronico` | `email` |
| `cr904_fechadecumpleanos` | `birth_date` |
| `cr904_barrioovereda` | `place_name` |
| `cr904_comunaocorregimiento` | `division_name` |
| `cr904_direccion` | `full_address` |
| `cr904_ciudad` | `city` |
| `cr904_departamento` | `department` |
| `cr904_pais` | `country` |
| `cr904_latitud` | `latitude` |
| `cr904_longitud` | `longitude` |

El nuevo esquema separa además los componentes de dirección (`road_type`, `road_number`, `road_suffix`, `secondary_number`, `address_extra`) para evitar perder estructura y facilitar reportes futuros.

## 14. Validaciones realizadas sobre esta entrega

Antes de empaquetar el proyecto se verificó:

- sintaxis de módulos JavaScript con `node --check`;
- sintaxis JSX de páginas y componentes mediante el parser de TypeScript;
- imports internos y estructura de rutas;
- validación de formulario en cliente y servidor;
- construcción de dirección con una prueba de datos válida;
- RLS y separación entre clave pública y clave privada;
- 542 registros territoriales únicos incluidos en `seed.sql`;
- recursos originales incluidos en `public/`.

El entorno de generación no pudo conectarse a `registry.npmjs.org`, por lo que no fue posible ejecutar `npm install` / `next build` aquí. En un equipo con acceso a npm, ejecuta `npm install` y luego `npm run build` antes de promover a producción; esos son también los comandos que usará el despliegue normal de Vercel.
"# micolacteos" 
"# micolacteos" 
