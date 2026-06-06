// =============================================================
// reservas.js  —  Panel de administración de reservas (solo admin)
// =============================================================
// El administrador puede ver TODAS las reservas de todos los usuarios,
// cambiarles el estado (confirmar / cancelar) y borrarlas permanentemente.
//
// Lógica de cupos importante:
//   · Al CANCELAR una reserva no cancelada → se devuelven los cupos a la función.
//   · Al BORRAR una reserva no cancelada   → también se devuelven los cupos.
//   · Si ya estaba cancelada, los cupos ya fueron devueltos antes → no duplicar.
//   Esto asegura que los cupos disponibles siempre reflejen la realidad.
// =============================================================

// Importamos todas las funciones de API que necesita esta página.
import { getReservas, updateReserva, deleteReserva, getFunciones, updateFuncion } from '../services/api.js'
import { renderNavbar, setupNavbar } from '../components/navbar.js'
import { toast } from '../utils/toast.js'

// Variables a nivel de módulo para guardar los datos cargados.
// Necesitan estar aquí (fuera de renderReservas) porque
// window.cambiarEstadoReserva y window.eliminarReservaAdmin las usan,
// y esas funciones son definidas dentro de renderReservas pero expuestas globalmente.
let _reservas  = []   // todas las reservas del sistema
let _funciones = []   // todas las funciones (para calcular devolución de cupos)


// ─────────────────────────────────────────────────────────────
// renderReservas — inyecta la página y conecta sus eventos
// ─────────────────────────────────────────────────────────────
// Recibe: app (HTMLElement) — el div #app.
export async function renderReservas(app) {

    app.innerHTML = `
        ${renderNavbar()}
        <div class="container page">
            <div class="page-header">
                <h1 class="page-title">Todas las Reservas</h1>
            </div>

            <!-- Tarjetas de estadísticas (Total / Pendientes / Confirmadas / Canceladas) -->
            <div class="stats-grid" id="stats-reservas"></div>

            <!-- Filtros de búsqueda por texto y por fecha -->
            <div style="display:flex; gap:0.75rem; margin-bottom:1.5rem; flex-wrap:wrap">
                <input class="form-control" type="text" id="reservas-search"
                    placeholder="Buscar por usuario o película..." style="max-width:300px"/>
                <input class="form-control" type="date" id="reservas-fecha" style="max-width:200px"/>
                <button class="btn btn-secondary" id="reservas-limpiar">Limpiar filtros</button>
            </div>

            <!-- Tabla de reservas (se rellena dinámicamente) -->
            <div id="reservas-content">
                <p style="color:var(--color-text-muted)">Cargando...</p>
            </div>
        </div>
    `

    setupNavbar()


    // ── cargarReservas — pide los datos al servidor y renderiza la tabla ──
    async function cargarReservas() {
        const content = document.getElementById('reservas-content')

        try {
            // Promise.all() ejecuta AMBAS peticiones EN PARALELO y espera
            // a que las dos terminen antes de continuar.
            // Es más eficiente que hacer:
            //   _reservas  = await getReservas()
            //   _funciones = await getFunciones()  ← esperaría a la primera
            // La desestructuración [a, b] = [...] asigna cada resultado a su variable.
            [_reservas, _funciones] = await Promise.all([
                getReservas(),    // devuelve array de todas las reservas
                getFunciones()    // devuelve array de todas las funciones
            ])

            // Conteos por estado para las tarjetas de estadísticas.
            const pendientes  = _reservas.filter(r => r.estado === 'pendiente').length
            const confirmadas = _reservas.filter(r => r.estado === 'confirmada').length
            const canceladas  = _reservas.filter(r => r.estado === 'cancelada').length

            document.getElementById('stats-reservas').innerHTML = `
                <div class="stat-card">
                    <div class="stat-label">Total</div>
                    <div class="stat-value">${_reservas.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Pendientes</div>
                    <div class="stat-value" style="color:var(--color-warning)">${pendientes}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Confirmadas</div>
                    <div class="stat-value" style="color:var(--color-success)">${confirmadas}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Canceladas</div>
                    <div class="stat-value" style="color:var(--color-danger)">${canceladas}</div>
                </div>
            `

            if (_reservas.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <p class="empty-state-text">No hay reservas aún</p>
                    </div>
                `
                return
            }

            // Tabla de reservas con botones de acción.
            // Los botones usan window.cambiarEstadoReserva y window.eliminarReservaAdmin
            // porque están dentro de template literals HTML (mismo patrón que funciones.js).
            content.innerHTML = `
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Película</th>
                                <th>Entradas</th>
                                <th>Fecha Reserva</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${_reservas.map(r => `
                                <tr>
                                    <td>${r.usuarioNombre}</td>
                                    <td>${r.peliculaNombre}</td>
                                    <td style="text-align:center">${r.cantidadEntradas}</td>
                                    <td>${r.fechaReserva}</td>
                                    <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
                                    <td>
                                        <div style="display:flex; gap:0.4rem; flex-wrap:wrap">
                                            <!-- "Confirmar" solo aparece si la reserva está pendiente -->
                                            ${r.estado === 'pendiente' ? `
                                                <button class="btn btn-success btn-sm"
                                                    onclick="window.cambiarEstadoReserva('${r.id}', 'confirmada')">
                                                    Confirmar
                                                </button>
                                            ` : ''}
                                            <!-- "Cancelar" aparece si la reserva NO está ya cancelada -->
                                            ${r.estado !== 'cancelada' ? `
                                                <button class="btn btn-warning btn-sm"
                                                    onclick="window.cambiarEstadoReserva('${r.id}', 'cancelada')">
                                                    Cancelar
                                                </button>
                                            ` : ''}
                                            <!-- "Borrar" siempre aparece (borra el registro completamente) -->
                                            <button class="btn btn-danger btn-sm"
                                                onclick="window.eliminarReservaAdmin('${r.id}')">
                                                Borrar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `

        } catch (error) {
            content.innerHTML = `<p style="color:var(--color-danger)">Error al cargar reservas</p>`
        }
    }


    // ── window.cambiarEstadoReserva — confirma o cancela una reserva ──
    // Recibe: reservaId (string), nuevoEstado (string: 'confirmada' o 'cancelada').
    // Accesible desde los onclick de la tabla.
    window.cambiarEstadoReserva = async function(reservaId, nuevoEstado) {
        try {
            // Buscamos el objeto reserva en el array ya cargado (sin nueva petición).
            const reserva = _reservas.find(r => r.id === reservaId)
            if (!reserva) return

            // Si se está CANCELANDO y la reserva no estaba ya cancelada,
            // devolvemos los cupos a la función para que otros usuarios puedan reservar.
            if (nuevoEstado === 'cancelada' && reserva.estado !== 'cancelada') {
                const funcion = _funciones.find(f => f.id === reserva.funcionId)
                if (funcion) {
                    // Sumamos de vuelta las entradas canceladas a los cupos disponibles.
                    await updateFuncion(funcion.id, {
                        cuposDisponibles: funcion.cuposDisponibles + reserva.cantidadEntradas
                    })
                }
            }

            // Actualizamos el estado de la reserva en el servidor.
            await updateReserva(reservaId, { estado: nuevoEstado })
            toast.success(`Reserva ${nuevoEstado}`)
            cargarReservas()   // recargamos la tabla para ver el cambio reflejado

        } catch (error) {
            toast.error('Error al actualizar la reserva')
        }
    }


    // ── window.eliminarReservaAdmin — borra una reserva permanentemente ──
    // Accesible desde los onclick de la tabla.
    window.eliminarReservaAdmin = async function(id) {
        if (!confirm('¿Eliminar esta reserva?')) return

        try {
            const reserva = _reservas.find(r => r.id === id)

            // Si la reserva no estaba cancelada, hay que devolver sus cupos
            // antes de borrarla. Si ya estaba cancelada, los cupos ya fueron
            // devueltos al momento de cancelar → no los devolvemos dos veces.
            if (reserva && reserva.estado !== 'cancelada') {
                const funcion = _funciones.find(f => f.id === reserva.funcionId)
                if (funcion) {
                    await updateFuncion(funcion.id, {
                        cuposDisponibles: funcion.cuposDisponibles + reserva.cantidadEntradas
                    })
                }
            }

            await deleteReserva(id)
            toast.success('Reserva eliminada')
            cargarReservas()

        } catch (error) {
            toast.error('Error al eliminar')
        }
    }


    // ── Filtros de búsqueda ──────────────────────────────────
    // Filtra _reservas localmente según texto y/o fecha.
    // No hace nuevas peticiones al servidor — filtra los datos ya cargados.
    function aplicarFiltrosReservas() {
        // ?. es "optional chaining": si el elemento no existe en el DOM,
        // devuelve undefined en lugar de lanzar un TypeError.
        // || '' da string vacío como fallback si el valor es undefined.
        const texto = document.getElementById('reservas-search')?.value.trim().toLowerCase() || ''
        const fecha = document.getElementById('reservas-fecha')?.value || ''

        let resultado = [..._reservas]   // copia del array para no mutar el original

        if (texto) {
            resultado = resultado.filter(r =>
                r.usuarioNombre.toLowerCase().includes(texto) ||
                r.peliculaNombre.toLowerCase().includes(texto)
            )
        }

        if (fecha) {
            // fechaReserva está guardada en formato 'YYYY-MM-DD', igual que el input type="date".
            resultado = resultado.filter(r => r.fechaReserva === fecha)
        }

        // Renderizamos solo la tabla (sin tocar las estadísticas) con los resultados filtrados.
        renderTablaFiltrada(resultado)
    }


    // Genera solo la tabla (sin el bloque de stats) para mostrar resultados filtrados.
    // Tiene el mismo HTML de tabla que cargarReservas() pero solo actualiza #reservas-content,
    // dejando intactas las tarjetas de estadísticas.
    function renderTablaFiltrada(reservas) {
        const content = document.getElementById('reservas-content')

        if (reservas.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-text">No hay reservas que coincidan con la búsqueda</p>
                </div>
            `
            return
        }

        content.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Usuario</th><th>Película</th><th>Entradas</th>
                            <th>Fecha</th><th>Estado</th><th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reservas.map(r => `
                            <tr>
                                <td>${r.usuarioNombre}</td>
                                <td>${r.peliculaNombre}</td>
                                <td style="text-align:center">${r.cantidadEntradas}</td>
                                <td>${r.fechaReserva}</td>
                                <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
                                <td>
                                    <div style="display:flex; gap:0.4rem; flex-wrap:wrap">
                                        ${r.estado === 'pendiente'  ? `<button class="btn btn-success btn-sm" onclick="window.cambiarEstadoReserva('${r.id}', 'confirmada')">Confirmar</button>` : ''}
                                        ${r.estado !== 'cancelada' ? `<button class="btn btn-warning btn-sm" onclick="window.cambiarEstadoReserva('${r.id}', 'cancelada')">Cancelar</button>`  : ''}
                                        <button class="btn btn-danger btn-sm" onclick="window.eliminarReservaAdmin('${r.id}')">Borrar</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `
    }


    // ── Conectar los filtros al DOM ──────────────────────────
    // Usamos setTimeout de 100ms como workaround para un problema de timing.
    // El innerHTML de arriba inyecta los inputs en el DOM de forma SÍNCRONA,
    // pero cargarReservas() es ASYNC y puede estar en vuelo cuando llegamos aquí.
    // El timeout garantiza que los inputs ya existen y están listos en el DOM
    // antes de intentar agregarles event listeners.
    // Una alternativa más limpia sería conectar los filtros al final de cargarReservas(),
    // pero este workaround funciona igual de bien para este caso de uso.
    setTimeout(() => {
        document.getElementById('reservas-search')?.addEventListener('input',  aplicarFiltrosReservas)
        document.getElementById('reservas-fecha')?.addEventListener('change',  aplicarFiltrosReservas)
        document.getElementById('reservas-limpiar')?.addEventListener('click', () => {
            document.getElementById('reservas-search').value = ''   // vaciamos el buscador
            document.getElementById('reservas-fecha').value  = ''   // vaciamos la fecha
            renderTablaFiltrada(_reservas)                           // mostramos todas sin filtro
        })
    }, 100)


    // Carga inicial: pedimos y mostramos todas las reservas al abrir la página.
    cargarReservas()
}
