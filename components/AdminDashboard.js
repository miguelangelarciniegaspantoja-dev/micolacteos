'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';

export default function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');

  const supabase = getSupabaseBrowserClient();

  /**
   * Comprueba la sesión actual de Supabase cuando
   * se carga el panel administrativo.
   */
  useEffect(() => {
    if (!supabase) {
      setMessage(
        'Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
      );
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;

      setSession(data.session);

      if (data.session) {
        verifyAdmin(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    /**
     * Escucha cambios de autenticación.
     */
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);

        if (nextSession) {
          verifyAdmin(nextSession.user.id);
        } else {
          setIsAdmin(false);
          setRows([]);
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Comprueba que el usuario autenticado exista
   * dentro de la tabla app_admins.
   */
  async function verifyAdmin(userId) {
    setLoading(true);

    const { data, error } = await supabase
      .from('app_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      setIsAdmin(false);

      setMessage(
        'La cuenta inició sesión, pero no tiene permisos de administrador.'
      );

      setLoading(false);
      return;
    }

    setIsAdmin(true);
    setMessage('');

    await loadRows();
  }

  /**
   * Obtiene todos los registros almacenados
   * en benefit_registrations.
   *
   * Se utiliza paginación de 1000 registros
   * para evitar el límite habitual de Supabase.
   */
  async function loadRows() {
    setLoading(true);
    setMessage('');

    const pageSize = 1000;
    const allRows = [];

    try {
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('benefit_registrations')
          .select('*')
          .order('created_at', {
            ascending: false,
          })
          .range(from, from + pageSize - 1);

        if (error) {
          throw error;
        }

        allRows.push(...(data || []));

        /**
         * Cuando Supabase devuelve menos registros
         * que el tamaño de página significa que
         * ya llegamos al final.
         */
        if (!data || data.length < pageSize) {
          break;
        }
      }

      setRows(allRows);
    } catch (error) {
      console.error('Error loading registrations:', error);

      setMessage(
        `No fue posible cargar los registros: ${
          error?.message || 'Error desconocido'
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Inicia sesión usando Supabase Auth.
   */
  async function signIn(event) {
    event.preventDefault();

    if (!supabase) {
      setMessage(
        'Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
      );

      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Admin login error:', error);

      setMessage('Correo o contraseña incorrectos.');
      setLoading(false);
    }
  }

  /**
   * Cierra la sesión administrativa.
   */
  async function signOut() {
    if (!supabase) return;

    await supabase.auth.signOut();

    setSession(null);
    setIsAdmin(false);
    setRows([]);
    setEmail('');
    setPassword('');
    setMessage('');
  }

  /**
   * Filtra los registros mostrados en el panel.
   */
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.full_name,
        row.document_number,
        row.phone,
        row.email,
        row.place_name,
        row.division_name,
        row.full_address,
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      )
    );
  }, [rows, search]);

  /**
   * Exporta los registros visibles a Excel.
   *
   * IMPORTANTE:
   * Se utiliza ExcelJS y NO la librería xlsx.
   */
  async function exportExcel() {
    if (!filtered.length) {
      setMessage('No hay registros para exportar.');
      return;
    }

    try {
      setMessage('');

      /**
       * Importación dinámica para evitar cargar
       * ExcelJS cuando no se está usando.
       */
      const ExcelJSModule = await import('exceljs');

      const ExcelJS =
        ExcelJSModule.default || ExcelJSModule;

      /**
       * Transformamos los datos almacenados en
       * Supabase a columnas entendibles.
       */
      const exportRows = filtered.map((row) => ({
        'Fecha de registro': formatDate(row.created_at),

        'Nombre completo':
          row.full_name || '',

        'Tipo de documento':
          row.document_type || '',

        'Número de documento':
          row.document_number || '',

        'Celular o teléfono':
          row.phone || '',

        'Correo electrónico':
          row.email || '',

        'Fecha de nacimiento':
          row.birth_date || '',

        'Tratamiento de datos autorizado':
          row.data_processing_authorized
            ? 'Sí'
            : 'No',

        'Comunicaciones comerciales autorizadas':
          row.commercial_communications_authorized
            ? 'Sí'
            : 'No',

        'Canal preferido':
          row.preferred_contact_channel || '',

        'Tipo de zona':
          row.zone_type || '',

        'Barrio o vereda':
          row.place_name || '',

        'Comuna o corregimiento':
          row.division_name || '',

        Dirección:
          row.full_address || '',

        'Tipo de vía':
          row.road_type || '',

        'Número de vía':
          row.road_number || '',

        Sufijo:
          row.road_suffix || '',

        'Número siguiente':
          row.secondary_number || '',

        Complemento:
          row.address_extra || '',

        Ciudad:
          row.city || '',

        Departamento:
          row.department || '',

        País:
          row.country || '',

        Latitud:
          row.latitude ?? '',

        Longitud:
          row.longitude ?? '',
      }));

      /**
       * Creamos el libro de Excel.
       */
      const workbook = new ExcelJS.Workbook();

      workbook.creator = 'AKI';
      workbook.lastModifiedBy = 'AKI';
      workbook.created = new Date();
      workbook.modified = new Date();

      /**
       * Creamos la hoja.
       */
      const worksheet =
        workbook.addWorksheet('Registros');

      /**
       * Obtenemos automáticamente los nombres
       * de las columnas.
       */
      const headers =
        Object.keys(exportRows[0]);

      worksheet.columns = headers.map(
        (header) => ({
          header,
          key: header,

          /**
           * Ajustamos automáticamente
           * el ancho inicial.
           */
          width: Math.min(
            Math.max(
              header.length + 4,
              16
            ),
            38
          ),
        })
      );

      /**
       * Agregamos las filas.
       */
      exportRows.forEach((row) => {
        worksheet.addRow(row);
      });

      /**
       * Congelamos la primera fila.
       */
      worksheet.views = [
        {
          state: 'frozen',
          ySplit: 1,
        },
      ];

      /**
       * Estilo del encabezado.
       */
      const headerRow =
        worksheet.getRow(1);

      headerRow.font = {
        bold: true,
        color: {
          argb: 'FFFFFFFF',
        },
      };

      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FF173462',
        },
      };

      headerRow.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      headerRow.height = 25;

      /**
       * Aplicamos bordes, alineación y
       * ajuste de texto.
       */
      worksheet.eachRow(
        { includeEmpty: false },
        (row, rowNumber) => {
          row.eachCell((cell) => {
            cell.alignment = {
              vertical: 'top',
              horizontal:
                rowNumber === 1
                  ? 'center'
                  : 'left',
              wrapText: true,
            };

            cell.border = {
              top: {
                style: 'thin',
                color: {
                  argb: 'FFD8E1EB',
                },
              },
              left: {
                style: 'thin',
                color: {
                  argb: 'FFD8E1EB',
                },
              },
              bottom: {
                style: 'thin',
                color: {
                  argb: 'FFD8E1EB',
                },
              },
              right: {
                style: 'thin',
                color: {
                  argb: 'FFD8E1EB',
                },
              },
            };
          });
        }
      );

      /**
       * Autofiltro.
       */
      worksheet.autoFilter = {
        from: {
          row: 1,
          column: 1,
        },
        to: {
          row: 1,
          column: headers.length,
        },
      };

      /**
       * Generamos el archivo XLSX en memoria.
       */
      const buffer =
        await workbook.xlsx.writeBuffer();

      /**
       * Convertimos el contenido en Blob.
       */
      const blob = new Blob(
        [buffer],
        {
          type:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
      );

      /**
       * Creamos una URL temporal.
       */
      const url =
        URL.createObjectURL(blob);

      /**
       * Nombre del archivo con fecha.
       */
      const currentDate =
        new Date()
          .toISOString()
          .slice(0, 10);

      const fileName =
        `registros-colacteos-${currentDate}.xlsx`;

      /**
       * Forzamos la descarga desde el navegador.
       */
      const link =
        document.createElement('a');

      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);

      link.click();

      link.remove();

      /**
       * Liberamos la URL temporal.
       */
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        'Excel export error:',
        error
      );

      setMessage(
        'No fue posible generar el archivo Excel. Revisa la consola para obtener más información.'
      );
    }
  }

  /**
   * Pantalla de carga.
   */
  if (loading) {
    return (
      <Panel>
        <div className="flex min-h-[250px] items-center justify-center">
          <div className="text-center">
            <div
              className="
                mx-auto
                mb-4
                h-10
                w-10
                animate-spin
                rounded-full
                border-4
                border-white/30
                border-t-white
              "
            />

            <p className="font-semibold text-white">
              Cargando...
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  /**
   * Pantalla de login.
   */
  if (!session || !isAdmin) {
    return (
      <Panel>
        <div className="mx-auto max-w-md">
          <h1
            className="
              mb-2
              text-3xl
              font-extrabold
              text-white
            "
          >
            Administración
          </h1>

          <p
            className="
              mb-6
              text-[#e5ebff]
            "
          >
            Inicia sesión con una cuenta
            autorizada
          </p>

          {!supabase ? null : !session ? (
            <form
              onSubmit={signIn}
              className="space-y-4"
            >
              <label
                className="
                  block
                  font-bold
                  text-white
                "
              >
                Correo

                <input
                  type="email"
                  className="colacteos-input"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  required
                  autoComplete="email"
                  placeholder="administrador@correo.com"
                />
              </label>

              <label
                className="
                  block
                  font-bold
                  text-white
                "
              >
                Contraseña

                <input
                  type="password"
                  className="colacteos-input"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </label>

              <button
                type="submit"
                className="
                  w-full
                  rounded-lg
                  bg-[#0d8eea]
                  px-5
                  py-3
                  font-bold
                  text-white
                  transition
                  hover:bg-[#34a8f2]
                "
              >
                Ingresar
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={signOut}
              className="
                rounded-lg
                bg-[#0d8eea]
                px-5
                py-3
                font-bold
                text-white
              "
            >
              Cerrar sesión
            </button>
          )}

          {message && (
            <div
              role="alert"
              className="
                mt-4
                rounded-lg
                bg-[#fff3cd]
                p-3
                font-semibold
                text-[#542d00]
              "
            >
              {message}
            </div>
          )}
        </div>
      </Panel>
    );
  }

  /**
   * Dashboard administrativo.
   */
  return (
    <Panel>
      <div className="flex flex-col gap-5">
        {/* Encabezado */}
        <div
          className="
            flex
            flex-wrap
            items-center
            justify-between
            gap-3
          "
        >
          <div>
            <h1
              className="
                text-3xl
                font-extrabold
                text-white
              "
            >
              Registros de beneficios
            </h1>

            <p
              className="
                mt-1
                text-[#e5ebff]
              "
            >
              {filtered.length}{' '}
              registro(s) visibles.
            </p>

            {search && (
              <p
                className="
                  mt-1
                  text-sm
                  text-[#cdd8f5]
                "
              >
                Total almacenado:{' '}
                {rows.length}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div
            className="
              flex
              flex-wrap
              gap-2
            "
          >
            <button
              type="button"
              onClick={loadRows}
              className="
                rounded-lg
                border
                border-white/40
                px-4
                py-2
                font-bold
                text-white
                transition
                hover:bg-white/10
              "
            >
              Actualizar
            </button>

            <button
              type="button"
              onClick={exportExcel}
              disabled={!filtered.length}
              className="
                rounded-lg
                bg-[#0d8eea]
                px-4
                py-2
                font-bold
                text-white
                transition
                hover:bg-[#34a8f2]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Exportar Excel
            </button>

            <button
              type="button"
              onClick={signOut}
              className="
                rounded-lg
                border
                border-white/40
                px-4
                py-2
                font-bold
                text-white
                transition
                hover:bg-white/10
              "
            >
              Salir
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div>
          <label
            htmlFor="admin-search"
            className="
              mb-2
              block
              font-bold
              text-white
            "
          >
            Buscar registros
          </label>

          <input
            id="admin-search"
            type="search"
            className="colacteos-input"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Buscar por nombre, documento, teléfono, correo, barrio/vereda o dirección"
          />
        </div>

        {/* Mensajes */}
        {message && (
          <div
            role="alert"
            className="
              rounded-lg
              bg-[#fff3cd]
              p-3
              font-semibold
              text-[#542d00]
            "
          >
            {message}
          </div>
        )}

        {/* Tabla */}
        <div
          className="
            overflow-x-auto
            rounded-xl
            bg-white
            shadow-lg
          "
        >
          <table
            className="
              w-full
              min-w-[1150px]
              text-left
              text-sm
              text-[#173462]
            "
          >
            <thead
              className="
                bg-[#d8e8f5]
                text-[#172d63]
              "
            >
              <tr>
                <Th>Fecha</Th>

                <Th>
                  Nombre
                </Th>

                <Th>
                  Documento
                </Th>

                <Th>
                  Teléfono
                </Th>

                <Th>
                  Correo
                </Th>

                <Th>
                  Zona
                </Th>

                <Th>
                  Dirección
                </Th>

                <Th>
                  Comunicaciones
                </Th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="
                    border-t
                    border-slate-200
                    align-top
                    transition
                    hover:bg-slate-50
                  "
                >
                  <Td>
                    {formatDate(
                      row.created_at
                    )}
                  </Td>

                  <Td>
                    <span className="font-semibold">
                      {row.full_name}
                    </span>
                  </Td>

                  <Td>
                    {row.document_type}

                    <br />

                    <span className="font-semibold">
                      {
                        row.document_number
                      }
                    </span>
                  </Td>

                  <Td>
                    {row.phone}
                  </Td>

                  <Td>
                    {row.email}
                  </Td>

                  <Td>
                    <span className="font-semibold">
                      {row.zone_type}
                    </span>

                    {row.place_name
                      ? (
                        <>
                          <br />

                          {
                            row.place_name
                          }
                        </>
                      )
                      : null}

                    {row.division_name
                      ? (
                        <>
                          <br />

                          <span className="text-xs text-slate-500">
                            {
                              row.division_name
                            }
                          </span>
                        </>
                      )
                      : null}
                  </Td>

                  <Td>
                    {row.full_address}
                  </Td>

                  <Td>
                    {row.commercial_communications_authorized
                      ? (
                        <>
                          Sí

                          {row.preferred_contact_channel
                            ? (
                              <>
                                <br />

                                <span className="text-xs text-slate-500">
                                  {
                                    row.preferred_contact_channel
                                  }
                                </span>
                              </>
                            )
                            : null}
                        </>
                      )
                      : 'No'}
                  </Td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <Td colSpan={8}>
                    <div
                      className="
                        py-10
                        text-center
                        text-slate-500
                      "
                    >
                      No hay registros para
                      mostrar.
                    </div>
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

/**
 * Contenedor visual principal.
 */
function Panel({ children }) {
  return (
    <section
      className="
        rounded-2xl
        border
        border-white/20
        bg-[rgba(17,33,89,.86)]
        p-5
        shadow-[0_18px_40px_rgba(0,0,0,.2)]
        md:p-8
      "
    >
      {children}
    </section>
  );
}

/**
 * Encabezado reutilizable de la tabla.
 */
function Th({ children }) {
  return (
    <th
      className="
        whitespace-nowrap
        px-4
        py-3
        font-extrabold
      "
    >
      {children}
    </th>
  );
}

/**
 * Celda reutilizable de la tabla.
 */
function Td({
  children,
  colSpan,
}) {
  return (
    <td
      colSpan={colSpan}
      className="
        px-4
        py-3
      "
    >
      {children}
    </td>
  );
}

/**
 * Convierte fechas UTC al horario colombiano.
 */
function formatDate(value) {
  if (!value) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone:
          'America/Bogota',
      }
    ).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}