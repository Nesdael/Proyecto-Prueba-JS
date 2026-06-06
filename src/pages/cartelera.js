import { getFunciones, createReserva, updateFuncion } from '../services/api.js'
import { getSession } from '../services/auth.js'
import { renderNavbar, setupNavbar } from '../components/navbar.js'
import { toast } from '../utils/toast.js'

export async function renderCartelera(app) {
    const session = getSession()

    app.innerHTML = `
        ${renderNavbar()}
        <div class="container page">
        <div class="page-header">
            <h1 class="page-title">Cartelera</h1>
        </div>

        <div style="display:flex; gap:0.75rem; margin-bottom:1.5rem; flex-wrap:wrap">
            <input class="form-control" type="text" id="cartelera-search" placeholder="Buscar pelicula..." style="max-width:280px">
        <input class="form-control" type="date" id="cartelera-fecha" style="max-width:200px"/>
        <button class="btn btn-secondary" id="cartelera-limpiar">
            Limpiar filtros
        </button>
        </div>

        <div id="cartelera-content">
            <p style="color:var(--color-text-muted)">Cargando funciones...</p>
        </div>
        </div>

        <div class="modal-overlay" id="modal-reserva" style="display:none">
            <div class="modal">
            <div class="modal-header">
            <h2 class="modal-title">Hacer Reserva</h2>
                <button class="modal-close" id="modal-close">×</button>
            </div>
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

    setupNavbar()

    let funcionSeleccionada = null
    let todasLasFunciones   = []   // guardamos todas para poder filtrar

    // ---- CARGAR FUNCIONES ----
    async function cargarCartelera() {
        const content = document.getElementById('cartelera-content')
        try {
            const funciones = await getFunciones()
            // Solo mostramos las activas
            todasLasFunciones = funciones.filter(f => f.estado === 'activa')
            window._funciones = funciones   // guardamos todas (para el modal)
            renderCards(todasLasFunciones)
        } catch {
            content.innerHTML = `
            <div class="empty-state">
                <p class="empty-state-text">Error al cargar. ¿Está corriendo json-server?</p>
            </div>
        `
        }
    }

    function renderCards(funciones) {
        const content = document.getElementById('cartelera-content')

        if (funciones.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-text">No hay funciones que coincidan con tu búsqueda</p>
                </div>
                `
            return
    }

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
                ? `<button class="btn btn-primary" style="width:100%" data-id="${funcion.id}" id="btn-reservar-${funcion.id}">
                    Reservar Entradas
                    </button>`
                : `<button class="btn btn-secondary" style="width:100%" disabled>Sin Cupos</button>`
            }
            </div>
            </div>
            `).join('')}
        </div>
        `

    funciones.forEach(f => {
        const btn = document.getElementById(`btn-reservar-${f.id}`)
        if (btn) btn.addEventListener('click', () => abrirReserva(f.id))
        })
    }

    function aplicarFiltros() {
    const textoBusqueda = document.getElementById('cartelera-search').value.trim().toLowerCase()
    const fechaFiltro   = document.getElementById('cartelera-fecha').value

    let resultado = [...todasLasFunciones]

    // Filtrar por texto
    if (textoBusqueda) {
        resultado = resultado.filter(f =>
            f.pelicula.toLowerCase().includes(textoBusqueda) ||
            f.sala.toLowerCase().includes(textoBusqueda)
        )
    }

    // Filtrar por fecha
    if (fechaFiltro) {
        resultado = resultado.filter(f => f.fecha === fechaFiltro)
    }

    renderCards(resultado)
    }

  // Eventos de los filtros (se ejecutan mientras el usuario escribe/cambia)
    document.getElementById('cartelera-search').addEventListener('input',  aplicarFiltros)
    document.getElementById('cartelera-fecha').addEventListener('change',  aplicarFiltros)
    document.getElementById('cartelera-limpiar').addEventListener('click', () => {
    document.getElementById('cartelera-search').value = ''
    document.getElementById('cartelera-fecha').value  = ''
    renderCards(todasLasFunciones)
    })

    // ---- MODAL DE RESERVA ----
    function abrirReserva(funcionId) {
        funcionSeleccionada = window._funciones.find(f => f.id === funcionId)
        if (!funcionSeleccionada) return

        document.getElementById('modal-funcion-info').innerHTML = `
            <div style="background:var(--color-surface2); border-radius:8px; padding:1rem">
                <p style="font-weight:700; margin-bottom:0.5rem">${funcionSeleccionada.pelicula}</p>
                <p style="color:var(--color-text-muted); font-size:0.85rem">
                ${funcionSeleccionada.fecha} · ${funcionSeleccionada.hora}<br/>
                Cupos disponibles: ${funcionSeleccionada.cuposDisponibles}
                </p>
            </div>
        `

    const inputCantidad = document.getElementById('cantidad-entradas')
    inputCantidad.max   = funcionSeleccionada.cuposDisponibles
    inputCantidad.value = 1

    document.getElementById('modal-reserva').style.display = 'flex'
    }

    function cerrarModal() {
        document.getElementById('modal-reserva').style.display = 'none'
        funcionSeleccionada = null
    }

    document.getElementById('modal-close').addEventListener('click',  cerrarModal)
    document.getElementById('modal-cancel').addEventListener('click', cerrarModal)

    document.getElementById('modal-confirm').addEventListener('click', async () => {
        const cantidad = parseInt(document.getElementById('cantidad-entradas').value)

    if (isNaN(cantidad) || cantidad < 1) {
        toast.error('Ingresa una cantidad válida')
        return
    }
    if (cantidad > funcionSeleccionada.cuposDisponibles) {
        toast.error(`Solo hay ${funcionSeleccionada.cuposDisponibles} cupos disponibles`)
        return
    }

    try {
        await createReserva({
        usuarioId:        session.id,
        usuarioNombre:    session.name,
        funcionId:        funcionSeleccionada.id,
        peliculaNombre:   funcionSeleccionada.pelicula,
        cantidadEntradas: cantidad,
        fechaReserva:     new Date().toISOString().split('T')[0],
        estado:           'pendiente'
        })

        await updateFuncion(funcionSeleccionada.id, {
            cuposDisponibles: funcionSeleccionada.cuposDisponibles - cantidad
        })

        toast.success('¡Reserva creada exitosamente!')
        cerrarModal()
        cargarCartelera()
        } catch {
        toast.error('Error al crear la reserva')
        }
    })

    cargarCartelera()
}
