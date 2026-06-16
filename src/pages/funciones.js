// =============================================================
// funciones.js  —  Gestión de funciones (solo admin)
// =============================================================
// Esta página es el panel de control del administrador para
// gestionar las funciones (películas programadas en salas).
// Operaciones disponibles: ver todas, crear nuevas, editar, eliminar.
//
// Flujo de la página:
//   1. Al cargar → pide todas las funciones → muestra stats + tabla
//   2. Botón "+ Nueva Función" → abre el modal en modo "creación" (campos vacíos)
//   3. Botón "Editar" en la tabla → abre el modal con los datos de esa función
//   4. Botón "Eliminar" → pide confirmación → borra del servidor
//   5. El modal maneja tanto crear como editar según el valor de editandoId
// =============================================================

// Importamos las 4 operaciones CRUD que necesita esta página.
// CRUD = Create, Read, Update, Delete (las 4 operaciones básicas de datos).
import { getFunciones, createFuncion, updateFuncion, deleteFuncion } from '../services/api.js'
import { renderNavbar, setupNavbar } from '../components/navbar.js'
import { toast } from '../utils/toast.js'

// Variable a nivel de módulo para guardar el array de funciones cargadas.
// Está AQUÍ (fuera de renderFunciones) porque las funciones window.editarFuncion
// y window.eliminarFuncion necesitan accederla, y esas funciones son definidas
// dentro de renderFunciones pero expuestas globalmente en window.
let _funciones = []


// ─────────────────────────────────────────────────────────────
// renderFunciones — renderiza la página de gestión y conecta eventos
// ─────────────────────────────────────────────────────────────
// Recibe: app (HTMLElement) — el div #app.
export async function renderFunciones(app) {

    app.innerHTML = `
        ${renderNavbar()}
        <div class="container page">
            <div class="page-header">
                <h1 class="page-title">Gestión de Funciones</h1>
                <!-- Este botón abre el modal para crear una función nueva -->
                <button class="btn btn-primary" id="btn-nueva-funcion">+ Nueva Función</button>
            </div>

            <!-- Tarjetas de estadísticas (Total / Activas / Canceladas) -->
            <!-- Se rellenan dinámicamente en cargarFunciones() -->
            <div class="stats-grid" id="stats-funciones"></div>

            <!-- Tabla de funciones (se rellena dinámicamente en cargarFunciones()) -->
            <div id="funciones-content">
                <p style="color:var(--color-text-muted)">Cargando...</p>
            </div>
        </div>

        <!-- MODAL CREAR/EDITAR — oculto por defecto -->
        <div class="modal-overlay" id="modal-funcion" style="display:none">
            <div class="modal">
                <div class="modal-header">
                    <!-- El título cambia: "Nueva Función" al crear, "Editar Función" al editar -->
                    <h2 class="modal-title" id="modal-funcion-titulo">Nueva Función</h2>
                    <button class="modal-close" id="modal-funcion-close">×</button>
                </div>

                <div class="form-group">
                    <label class="form-label">Película</label>
                    <input class="form-control" type="text" id="f-pelicula" placeholder="Nombre de la película" />
                </div>

                <div class="form-group">
                    <label class="form-label">Sala</label>
                    <select class="form-control" id="f-sala">
                        <option value="Sala 1 - IMAX">Sala 1 - IMAX</option>
                        <option value="Sala 2 - 3D">Sala 2 - 3D</option>
                        <option value="Sala 3 - 2D">Sala 3 - 2D</option>
                        <option value="Sala 4 - 2D">Sala 4 - 2D</option>
                    </select>
                </div>

                <!-- Fecha y hora en dos columnas lado a lado -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem">
                    <div class="form-group">
                        <label class="form-label">Fecha</label>
                        <input class="form-control" type="date" id="f-fecha" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Hora</label>
                        <input class="form-control" type="time" id="f-hora" />
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Capacidad Total</label>
                    <input class="form-control" type="number" id="f-capacidad" min="1" placeholder="Ej: 100" />
                </div>

                <div class="form-group">
                    <label class="form-label">Estado</label>
                    <select class="form-control" id="f-estado">
                        <option value="activa">Activa</option>
                        <option value="cancelada">Cancelada</option>
                    </select>
                </div>

                <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:0.5rem">
                    <button class="btn btn-secondary" id="modal-funcion-cancel">Cancelar</button>
                    <button class="btn btn-primary"   id="modal-funcion-save">Guardar</button>
                </div>
            </div>
        </div>
    `

    setupNavbar()

    // ID de la función que se está editando en el modal.
    // null = estamos creando una función nueva (botón "+ Nueva Función").
    // string = estamos editando la función con ese ID (botón "Editar").
    // Se usa en el listener del botón "Guardar" para saber si crear o actualizar.
    let editandoId = null


    // ── cargarFunciones — pide los datos al servidor y actualiza la vista ──
    async function cargarFunciones() {
        const content = document.getElementById('funciones-content')

        try {
            // Pedimos todas las funciones y las guardamos en la variable de módulo.
            // Guardamos en _funciones (no una variable local) para que
            // window.editarFuncion pueda acceder al array sin otra petición.
            _funciones = await getFunciones()

            // Calculamos los conteos para las tarjetas de estadísticas.
            const activas    = _funciones.filter(f => f.estado === 'activa').length
            const canceladas = _funciones.filter(f => f.estado === 'cancelada').length

            // Inyectamos las tarjetas de estadísticas en su contenedor.
            document.getElementById('stats-funciones').innerHTML = `
                <div class="stat-card">
                    <div class="stat-label">Total Funciones</div>
                    <div class="stat-value">${_funciones.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Activas</div>
                    <div class="stat-value" style="color:var(--color-success)">${activas}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Canceladas</div>
                    <div class="stat-value" style="color:var(--color-danger)">${canceladas}</div>
                </div>
            `

            // Si no hay funciones creadas todavía, mostramos estado vacío.
            if (_funciones.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <p class="empty-state-text">No hay funciones. ¡Crea la primera!</p>
                    </div>
                `
                return
            }

            // Generamos la tabla con todas las funciones.
            // Nota sobre onclick="window.editarFuncion(...)":
            // Los botones están dentro de un template literal HTML generado con .map().
            // No podemos usar addEventListener directamente en ese contexto.
            // La solución es exponer las funciones en el objeto global window,
            // así el HTML generado puede llamarlas desde atributos onclick.
            content.innerHTML = `
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Película</th>
                                <th>Sala</th>
                                <th>Fecha</th>
                                <th>Hora</th>
                                <th>Cupos</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${_funciones.map(f => `
                                <tr>
                                    <td><strong>${f.pelicula}</strong></td>
                                    <td>${f.sala}</td>
                                    <td>${f.fecha}</td>
                                    <td>${f.hora}</td>
                                    <td>${f.cuposDisponibles} / ${f.capacidadTotal}</td>
                                    <td><span class="badge badge-${f.estado}">${f.estado}</span></td>
                                    <td>
                                        <div style="display:flex; gap:0.4rem">
                                            <button class="btn btn-secondary btn-sm" onclick="window.editarFuncion('${f.id}')">Editar</button>
                                            <button class="btn btn-danger btn-sm"    onclick="window.eliminarFuncion('${f.id}')">Eliminar</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `

        } catch (error) {
            content.innerHTML = `<p style="color:var(--color-danger)">Error al cargar funciones</p>`
        }
    }


    // ── abrirModal — prepara y muestra el modal de crear o editar ──
    // Recibe: funcion (objeto o null)
    //   null   → modo creación: campos vacíos, título "Nueva Función"
    //   objeto → modo edición: campos prellenados con los datos actuales
    function abrirModal(funcion = null) {
        const modal  = document.getElementById('modal-funcion')
        const titulo = document.getElementById('modal-funcion-titulo')

        if (funcion) {
            // Modo EDICIÓN: guardamos el id y rellenamos todos los campos
            // con los valores actuales de la función seleccionada.
            editandoId = funcion.id
            titulo.textContent = 'Editar Función'
            document.getElementById('f-pelicula').value  = funcion.pelicula
            document.getElementById('f-sala').value      = funcion.sala
            document.getElementById('f-fecha').value     = funcion.fecha
            document.getElementById('f-hora').value      = funcion.hora
            document.getElementById('f-capacidad').value = funcion.capacidadTotal
            document.getElementById('f-estado').value    = funcion.estado
        } else {
            // Modo CREACIÓN: limpiamos el id y vaciamos todos los campos
            // para que el admin empiece con el formulario en blanco.
            editandoId = null
            titulo.textContent = '+ Nueva Función'
            document.getElementById('f-pelicula').value  = ''
            document.getElementById('f-sala').value      = 'Sala 1 - IMAX'
            document.getElementById('f-fecha').value     = ''
            document.getElementById('f-hora').value      = ''
            document.getElementById('f-capacidad').value = ''
            document.getElementById('f-estado').value    = 'activa'
        }

        modal.style.display = 'flex'   // hacemos visible el modal
    }


    // ── cerrarModal — oculta el modal y limpia el estado ──
    function cerrarModal() {
        document.getElementById('modal-funcion').style.display = 'none'
        editandoId = null   // reseteamos para evitar mezclar crear con editar
    }

    // Eventos de los botones del encabezado y pie del modal.
    document.getElementById('btn-nueva-funcion').addEventListener('click',   () => abrirModal())
    document.getElementById('modal-funcion-close').addEventListener('click',  cerrarModal)
    document.getElementById('modal-funcion-cancel').addEventListener('click', cerrarModal)


    // ── Guardar función (crear o editar) ──
    document.getElementById('modal-funcion-save').addEventListener('click', async () => {

        // Leemos y limpiamos los valores del formulario.
        const pelicula  = document.getElementById('f-pelicula').value.trim()
        const sala      = document.getElementById('f-sala').value
        const fecha     = document.getElementById('f-fecha').value
        const hora      = document.getElementById('f-hora').value
        const capacidad = parseInt(document.getElementById('f-capacidad').value)
        const estado    = document.getElementById('f-estado').value

        // Validamos que todos los campos tengan valor.
        // isNaN(capacidad) es true si el campo estaba vacío o tenía texto (no número).
        if (!pelicula || !sala || !fecha || !hora || isNaN(capacidad)) {
            toast.error('Completa todos los campos')
            return
        }

        // Construimos el objeto con los datos del formulario.
        const datos = { pelicula, sala, fecha, hora, capacidadTotal: capacidad, estado }

        try {
            if (editandoId) {
                // EDITAR: actualizamos la función existente con PATCH.
                // No modificamos cuposDisponibles aquí: si el admin cambia
                // la capacidad total, los cupos ya usados siguen siendo válidos.
                await updateFuncion(editandoId, datos)
                toast.success('Función actualizada')
            } else {
                // CREAR: al crear una función nueva, los cupos disponibles
                // empiezan siendo iguales a la capacidad total (nadie ha reservado aún).
                datos.cuposDisponibles = capacidad
                await createFuncion(datos)
                toast.success('Función creada')
            }

            cerrarModal()
            cargarFunciones()   // recargamos la tabla para ver los cambios

        } catch (error) {
            toast.error('Error al guardar la función')
        }
    })


    // ── window.editarFuncion — accesible desde los onclick de la tabla ──
    // Los botones "Editar" en el HTML generado llaman a window.editarFuncion(id).
    // No se puede usar addEventListener directamente en template literals HTML,
    // por eso la función se cuelga del objeto global window.
    window.editarFuncion = function(id) {
        // Buscamos el objeto función en el array ya cargado (sin otra petición al servidor).
        const funcion = _funciones.find(f => f.id === id)
        if (funcion) abrirModal(funcion)   // abrimos el modal en modo edición
    }


    // ── window.eliminarFuncion — accesible desde los onclick de la tabla ──
    window.eliminarFuncion = async function(id) {
        // confirm() muestra un diálogo nativo del navegador.
        // Devuelve true si el usuario hace clic en "Aceptar", false si hace clic en "Cancelar".
        if (!confirm('¿Eliminar esta función? Esta acción no se puede deshacer.')) return

        try {
            await deleteFuncion(id)   // DELETE /funciones/:id en el servidor
            toast.success('Función eliminada')
            cargarFunciones()   // recargamos la tabla para que desaparezca la fila
        } catch (error) {
            toast.error('Error al eliminar')
        }
    }


    // Carga inicial: al abrir la página pedimos y mostramos las funciones.
    cargarFunciones()
}
