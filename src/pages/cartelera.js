// =============================================================
// cartelera.js  —  Página de películas disponibles (usuario)
// =============================================================
// Esta es la página principal del usuario normal. Muestra todas
// las funciones ACTIVAS como tarjetas y permite hacer una reserva
// a través de un modal emergente.
//
// Flujo principal de esta página:
//   1. Se carga la página → se piden todas las funciones al servidor
//   2. Se filtran para mostrar solo las marcadas como 'activa'
//   3. El usuario puede buscar por nombre/sala y filtrar por fecha
//   4. Al hacer clic en "Reservar", se abre un modal con el detalle
//   5. El usuario elige cuántas entradas quiere y confirma
//   6. Se crea la reserva EN el servidor y se restan los cupos disponibles
// =============================================================

// Funciones de API que necesita esta página:
//   getFunciones  — cargar la lista de todas las películas/funciones
//   createReserva — guardar la nueva reserva del usuario en el servidor
//   updateFuncion — restar los cupos disponibles de la función al reservar
import { getFunciones, createReserva, updateFuncion } from '../services/api.js'

// getSession — para saber el ID y nombre del usuario que está reservando.
// Los guardamos en la reserva para identificar de quién es.
import { getSession } from '../services/auth.js'

// renderNavbar / setupNavbar — para incluir y activar la barra de navegación.
import { renderNavbar, setupNavbar } from '../components/navbar.js'

// toast — para notificaciones de éxito o error al reservar.
import { toast } from '../utils/toast.js'


// ─────────────────────────────────────────────────────────────
// renderCartelera — inyecta la página completa y conecta sus eventos
// ─────────────────────────────────────────────────────────────
// Recibe: app (HTMLElement) — el div #app.
export async function renderCartelera(app) {

    // Leemos la sesión al inicio para tener id y name disponibles
    // cuando el usuario confirme una reserva más adelante.
    const session = getSession()

    // Inyectamos el HTML completo de la página.
    // ${renderNavbar()} inserta el HTML del navbar al inicio del contenido.
    app.innerHTML = `
        ${renderNavbar()}
        <div class="container page">
            <div class="page-header">
                <h1 class="page-title">Cartelera</h1>
            </div>

            <!-- Controles de filtrado (búsqueda por texto y por fecha) -->
            <div style="display:flex; gap:0.75rem; margin-bottom:1.5rem; flex-wrap:wrap">
                <input class="form-control" type="text"  id="cartelera-search"
                    placeholder="Buscar pelicula..." style="max-width:280px">
                <input class="form-control" type="date"  id="cartelera-fecha" style="max-width:200px"/>
                <button class="btn btn-secondary"        id="cartelera-limpiar">Limpiar filtros</button>
            </div>

            <!-- Aquí se inyectan las tarjetas de películas dinámicamente -->
            <div id="cartelera-content">
                <p style="color:var(--color-text-muted)">Cargando funciones...</p>
            </div>
        </div>

        <!-- Modal de reserva — oculto por defecto (display:none)
             Se hace visible cuando el usuario hace clic en "Reservar" -->
        <div class="modal-overlay" id="modal-reserva" style="display:none">
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Hacer Reserva</h2>
                    <button class="modal-close" id="modal-close">×</button>
                </div>
                <!-- Info de la función seleccionada (se rellena dinámicamente en abrirReserva) -->
                <div id="modal-funcion-info" style="margin-bottom:1.5rem"></div>
                <div class="form-group">
                    <label class="form-label">Cantidad de entradas</label>
                    <input class="form-control" type="number" id="cantidad-entradas" min="1" value="1" />
                </div>
                <div style="display:flex; gap:0.5rem; justify-content:flex-end">
                    <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
                    <button class="btn btn-primary"   id="modal-confirm">Confirmar Reserva</button>
                </div>
            </div>
        </div>
    `

    // Activamos los eventos del navbar (logout, dark mode, link activo).
    // DEBE ir después del innerHTML porque los botones del navbar ya existen en el DOM.
    setupNavbar()

    // Guarda la función sobre la que se está haciendo la reserva.
    // Es null cuando el modal está cerrado.
    // Se asigna en abrirReserva() y se limpia en cerrarModal().
    let funcionSeleccionada = null

    // Array con todas las funciones activas cargadas del servidor.
    // Lo guardamos aquí para poder filtrar localmente sin hacer nuevas peticiones.
    let todasLasFunciones = []


    // ── cargarCartelera — pide las funciones al servidor y las renderiza ──
    // Se llama al inicio de la página y también después de crear una reserva
    // (para actualizar los cupos mostrados).
    async function cargarCartelera() {
        const content = document.getElementById('cartelera-content')
        try {
            // getFunciones() devuelve el array completo de funciones de db.json.
            const funciones = await getFunciones()

            // Solo mostramos las marcadas como 'activa'.
            // Las 'canceladas' no deben aparecer en la cartelera del usuario.
            todasLasFunciones = funciones.filter(f => f.estado === 'activa')

            // Guardamos TODAS las funciones (incluyendo canceladas) en window._funciones.
            // abrirReserva() las necesita para buscar por id sin importar el estado.
            // window permite compartir datos entre funciones anidadas de forma simple.
            window._funciones = funciones

            // Renderizamos las tarjetas con las funciones activas.
            renderCards(todasLasFunciones)

        } catch {
            // Si la petición falla (ej: json-server no está corriendo), mostramos error.
            content.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-text">Error al cargar. ¿Está corriendo json-server?</p>
                </div>
            `
        }
    }


    // ── renderCards — genera el HTML de tarjetas con las funciones ──
    // Recibe: funciones (array) — puede ser el array completo o un subconjunto filtrado.
    // No devuelve nada, inyecta HTML directamente en #cartelera-content.
    function renderCards(funciones) {
        const content = document.getElementById('cartelera-content')

        // Si no hay funciones que mostrar (búsqueda sin resultados o cartelera vacía),
        // mostramos un estado vacío con un mensaje informativo.
        if (funciones.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-text">No hay funciones que coincidan con tu búsqueda</p>
                </div>
            `
            return
        }

        // Generamos el HTML de la grilla de tarjetas.
        // .map() transforma cada objeto función en su HTML correspondiente.
        // .join('') une todos los strings del array en uno solo sin separadores.
        content.innerHTML = `
            <div class="card-grid">
                ${funciones.map(funcion => `
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem">
                            <h3 style="font-size:1.1rem; font-weight:700">${funcion.pelicula}</h3>
                            <span class="badge badge-activa">Activa</span>
                        </div>
                        <div style="color:var(--color-text-muted); font-size:0.85rem; line-height:2">
                            <div>${funcion.sala}</div>
                            <div>${funcion.fecha}</div>
                            <div>${funcion.hora}</div>
                            <div>Cupos: <strong style="color:var(--color-text)">${funcion.cuposDisponibles}</strong> / ${funcion.capacidadTotal}</div>
                        </div>
                        <div style="margin-top:1rem">
                            ${funcion.cuposDisponibles > 0
                                // Si hay cupos disponibles → botón activo para reservar
                                ? `<button class="btn btn-primary" style="width:100%" data-id="${funcion.id}" id="btn-reservar-${funcion.id}">
                                       Reservar Entradas
                                   </button>`
                                // Si no hay cupos → botón deshabilitado sin acción
                                : `<button class="btn btn-secondary" style="width:100%" disabled>Sin Cupos</button>`
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `

        // Conectamos el evento click a cada botón "Reservar".
        // Lo hacemos aquí (después del innerHTML) porque los botones
        // acaban de ser creados en el DOM con la línea anterior.
        funciones.forEach(f => {
            const btn = document.getElementById(`btn-reservar-${f.id}`)
            if (btn) btn.addEventListener('click', () => abrirReserva(f.id))
        })
    }


    // ── aplicarFiltros — filtra las funciones según los controles ──
    // Se ejecuta cada vez que el usuario escribe en el buscador o cambia la fecha.
    function aplicarFiltros() {
        // Leemos los valores actuales de los controles de filtro.
        const textoBusqueda = document.getElementById('cartelera-search').value.trim().toLowerCase()
        const fechaFiltro   = document.getElementById('cartelera-fecha').value

        // Partimos de UNA COPIA del array original con spread [...].
        // Usamos copia para no mutar todasLasFunciones, que se necesita
        // para "Limpiar filtros" y para futuros filtrados.
        let resultado = [...todasLasFunciones]

        // Filtro por texto: mantenemos funciones cuyo nombre de película
        // o sala contengan el texto buscado.
        // .toLowerCase() en ambos lados hace la búsqueda insensible a mayúsculas.
        if (textoBusqueda) {
            resultado = resultado.filter(f =>
                f.pelicula.toLowerCase().includes(textoBusqueda) ||
                f.sala.toLowerCase().includes(textoBusqueda)
            )
        }

        // Filtro por fecha: comparamos la fecha de la función con el valor
        // del input type="date". Ambos tienen el formato 'YYYY-MM-DD'.
        if (fechaFiltro) {
            resultado = resultado.filter(f => f.fecha === fechaFiltro)
        }

        // Renderizamos las tarjetas solo con las funciones que pasaron los filtros.
        renderCards(resultado)
    }

    // 'input' se dispara mientras el usuario escribe (letra a letra en tiempo real).
    document.getElementById('cartelera-search').addEventListener('input',  aplicarFiltros)
    // 'change' se dispara cuando el usuario termina de seleccionar una fecha.
    document.getElementById('cartelera-fecha').addEventListener('change',  aplicarFiltros)

    // "Limpiar filtros" vacía ambos inputs y vuelve a mostrar todas las funciones.
    document.getElementById('cartelera-limpiar').addEventListener('click', () => {
        document.getElementById('cartelera-search').value = ''
        document.getElementById('cartelera-fecha').value  = ''
        renderCards(todasLasFunciones)   // mostramos todas sin filtrar
    })


    // ── abrirReserva — prepara y muestra el modal de reserva ──
    // Recibe: funcionId (string) — el id de la función sobre la que se quiere reservar.
    function abrirReserva(funcionId) {
        // Buscamos el objeto completo de la función en window._funciones.
        // Usamos _funciones (todas) para tener el objeto con todos sus campos.
        funcionSeleccionada = window._funciones.find(f => f.id === funcionId)
        if (!funcionSeleccionada) return   // seguridad: si no la encuentra, no abrimos el modal

        // Rellenamos el bloque de información de la función dentro del modal.
        document.getElementById('modal-funcion-info').innerHTML = `
            <div style="background:var(--color-surface2); border-radius:8px; padding:1rem">
                <p style="font-weight:700; margin-bottom:0.5rem">${funcionSeleccionada.pelicula}</p>
                <p style="color:var(--color-text-muted); font-size:0.85rem">
                    ${funcionSeleccionada.fecha} · ${funcionSeleccionada.hora}<br/>
                    Cupos disponibles: ${funcionSeleccionada.cuposDisponibles}
                </p>
            </div>
        `

        // Configuramos el input de cantidad:
        //   min = 1 (no puede reservar 0 entradas)
        //   max = cupos disponibles (no puede reservar más de lo que hay)
        const inputCantidad = document.getElementById('cantidad-entradas')
        inputCantidad.max   = funcionSeleccionada.cuposDisponibles
        inputCantidad.value = 1   // valor inicial por defecto: 1 entrada

        // Hacemos visible el modal cambiando su estilo de 'none' a 'flex'.
        document.getElementById('modal-reserva').style.display = 'flex'
    }


    // ── cerrarModal — oculta el modal y limpia el estado ──
    function cerrarModal() {
        document.getElementById('modal-reserva').style.display = 'none'
        funcionSeleccionada = null   // limpiamos para que la próxima apertura sea fresca
    }

    // Conectamos los dos botones que cierran el modal sin confirmar.
    document.getElementById('modal-close').addEventListener('click',  cerrarModal)
    document.getElementById('modal-cancel').addEventListener('click', cerrarModal)


    // ── Confirmar reserva ──────────────────────────────────
    document.getElementById('modal-confirm').addEventListener('click', async () => {

        // parseInt convierte el string del input en número entero.
        const cantidad = parseInt(document.getElementById('cantidad-entradas').value)

        // Validamos que sea un número y que sea al menos 1.
        if (isNaN(cantidad) || cantidad < 1) {
            toast.error('Ingresa una cantidad válida')
            return
        }

        // Validamos que no exceda los cupos disponibles de la función.
        if (cantidad > funcionSeleccionada.cuposDisponibles) {
            toast.error(`Solo hay ${funcionSeleccionada.cuposDisponibles} cupos disponibles`)
            return
        }

        try {
            // PASO 1: Creamos la reserva en el servidor con todos sus datos.
            // new Date().toISOString() → "2025-06-06T18:30:00.000Z"
            // .split('T')[0]          → "2025-06-06"  (solo la parte de fecha)
            await createReserva({
                usuarioId:        session.id,                              // ¿quién reserva?
                usuarioNombre:    session.name,                            // nombre para mostrar en admin
                funcionId:        funcionSeleccionada.id,                  // ¿a qué función?
                peliculaNombre:   funcionSeleccionada.pelicula,            // nombre para mostrar
                cantidadEntradas: cantidad,                                // ¿cuántas entradas?
                fechaReserva:     new Date().toISOString().split('T')[0],  // fecha de hoy
                estado:           'pendiente'                              // estado inicial de la reserva
            })

            // PASO 2: Restamos los cupos de la función para que otros
            // usuarios vean el número correcto de cupos disponibles.
            // Si había 50 y se reservaron 3, ahora quedan 47.
            await updateFuncion(funcionSeleccionada.id, {
                cuposDisponibles: funcionSeleccionada.cuposDisponibles - cantidad
            })

            toast.success('¡Reserva creada exitosamente!')
            cerrarModal()
            cargarCartelera()   // recargamos las tarjetas para reflejar los cupos actualizados

        } catch {
            toast.error('Error al crear la reserva')
        }
    })


    // Cargamos las funciones al iniciar la página por primera vez.
    cargarCartelera()
}
