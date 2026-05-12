const _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// --- ESTADO GLOBAL ---
let CATALOGO_LIBROS = []; // Aquí guardaremos todo lo que venga de Supabase

// Referencias al DOM
const booksGrid = document.getElementById('booksGrid');
const searchInput = document.getElementById('searchInput');
const userNameDisplay = document.getElementById('userNameDisplay');

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }

    userNameDisplay.textContent = `Hola, ${session.user.user_metadata.full_name || 'Colaborador'}`;

    await descargarCatalogoCompleto();
    await consultarMisPrestamos(); // <--- AGREGAR ESTA LÍNEA
});

// --- LÓGICA DE DATOS ---

async function descargarCatalogoCompleto() {
    const { data, error } = await _supabase
        .from('libros')
        .select('*')
        .order('titulo', { ascending: true });

    if (error) return console.error(error);

    CATALOGO_LIBROS = data;
    // Quitamos la línea de renderizarLibros(CATALOGO_LIBROS) para que empiece en blanco
}

function filtrarLibros() {
    const termino = searchInput.value.toLowerCase().trim();

    // SI EL BUSCADOR ESTÁ VACÍO:
    if (termino.length === 0) {
        booksGrid.innerHTML = ''; // Limpiamos todo
        return;
    }

    // SI TIENE CONTENIDO: Procedemos a filtrar el array local
    const librosFiltrados = CATALOGO_LIBROS.filter(libro => {
        return libro.titulo.toLowerCase().includes(termino) || 
               libro.autor.toLowerCase().includes(termino);
    });

    renderizarLibros(librosFiltrados);
}

function renderizarLibros(lista) {
    booksGrid.innerHTML = ''; 

    if (lista.length === 0) {
        booksGrid.innerHTML = `<div class="col-12 text-center mt-5"><p class="text-muted">No hay coincidencias.</p></div>`;
        return;
    }

    lista.forEach(libro => {
        // Lógica para el estado del botón
        const estaDisponible = libro.disponible;
        const btnClass = estaDisponible ? 'btn-primary' : 'btn-secondary';
        const btnTexto = estaDisponible ? 'Solicitar Préstamo' : 'No Disponible';
        const btnDisabled = estaDisponible ? '' : 'disabled';
        
        const imagen = libro.url || 'https://via.placeholder.com/150?text=Sin+Portada';

        booksGrid.innerHTML += `
        <div class="col-6 col-md-4 col-lg-3 mb-4"> 
            <div class="card h-100 border-0 shadow-sm">
                <img src="${imagen}" class="card-img-top" style="height: 140px; object-fit: cover;">
                <div class="card-body p-2 p-md-3">
                    <h6 class="fw-bold mb-1 text-truncate" style="font-size: 0.9rem;">${libro.titulo}</h6>
                    <p class="small text-muted mb-2" style="font-size: 0.8rem;">${libro.autor}</p>
                    
                    <button class="btn btn-sm ${btnClass} w-100 fw-bold py-1" 
                            style="font-size: 0.75rem;"
                            onclick="solicitarPrestamo(${libro.id}, '${libro.titulo}')" 
                            ${btnDisabled}>
                        ${btnTexto}
                    </button>
                </div>
            </div>
        </div>`;
    });
}

// --- EVENTO EN TIEMPO REAL ---


// Esta función se dispara al dar clic en el botón del card
async function solicitarPrestamo(idLibro, tituloLibro) {
    const resultado = await Swal.fire({
        title: '¿Confirmar préstamo?',
        text: `Te llevarás el libro: ${tituloLibro}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, solicitar',
        cancelButtonText: 'Cancelar'
    });

    if (resultado.isConfirmed) {
        const idEmpleado = await obtenerIdColaborador();
        
        const { error } = await _supabase
            .from('bitacora')
            .insert([{ 
                id_libro: parseInt(idLibro), 
                id_usuario: idEmpleado, 
                tipo_movimiento: 'PRESTAMO' 
            }]);

        if (!error) {
            Swal.fire('¡Listo!', 'El préstamo ha sido registrado.', 'success');
            await descargarCatalogoCompleto();
            filtrarLibros();
        } else {
            Swal.fire('Error', error.message, 'error');
        }
    }
}
// Función para obtener el ID de nómina del usuario actual
async function obtenerIdColaborador() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return null;

    // Extraemos el número antes del @ (ej: "102030")
    return session.user.email.split('@')[0];
}

// Referencias nuevas
const loansTableBody = document.getElementById('loansTableBody');
const noLoansMessage = document.getElementById('noLoansMessage');

async function consultarMisPrestamos() {
    const idRaw = await obtenerIdColaborador();
    if (!idRaw) return;
    const idEmpleado = parseInt(idRaw); 

    // Usamos !inner para filtrar por una columna de la tabla relacionada (libros)
    const { data, error } = await _supabase
        .from('bitacora')
        .select(`
            id,
            fecha_evento,
            id_libro,
            libros!fk_libros_relacion!inner (
                titulo,
                autor,
                disponible
            )
        `)
        .eq('id_usuario', idEmpleado)
        .eq('tipo_movimiento', 'PRESTAMO')
        .eq('libros.disponible', false); // <--- CLAVE: Solo si el libro sigue prestado

    if (error) {
        console.error("Error:", error);
        return;
    }

    renderizarTablaPrestamos(data);
}

function renderizarTablaPrestamos(prestamos) {
    loansTableBody.innerHTML = '';

    if (!prestamos || prestamos.length === 0) {
        noLoansMessage.classList.remove('d-none');
        return;
    }

    noLoansMessage.classList.add('d-none');

    prestamos.forEach(p => {
        // Accedemos a p.libros porque es el nombre de la tabla relacionada
        const libro = p.libros; 
        
        if (!libro) return;

        const fechaPrestamo = new Date(p.fecha_evento).toLocaleDateString();
        // Calculamos una fecha límite de 7 días solo visualmente
        const f = new Date(p.fecha_evento);
        f.setDate(f.getDate() + 7);
        const fechaLimite = f.toLocaleDateString();

        loansTableBody.innerHTML += `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold">${libro.titulo}</div>
                    <div class="small text-muted">${libro.autor}</div>
                </td>
                <td class="align-middle">${fechaPrestamo}</td>
                <td class="align-middle">${fechaLimite}</td>
                <td class="align-middle">
                    <span class="badge bg-primary">En Posesión</span>
                </td>
                <td class="text-center align-middle">
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="devolverLibro(${p.id_libro})">
                        <i class="bi bi-arrow-return-left"></i> Devolver
                    </button>
                </td>
            </tr>
        `;
    });
}

async function devolverLibro(idLibro, idMovimientoOriginal) {
    // 1. Confirmación con estilo
    const { isConfirmed } = await Swal.fire({
        title: '¿Confirmar devolución?',
        text: "Asegúrate de haber entregado el libro físicamente en la biblioteca.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, entregado',
        cancelButtonText: 'No todavía'
    });

    if (!isConfirmed) return;

    // Mostrar un pequeño indicador de carga (opcional pero profesional)
    Swal.showLoading();

    const idEmpleadoRaw = await obtenerIdColaborador();
    const idEmpleado = parseInt(idEmpleadoRaw);

    // 2. Insertamos el movimiento de DEVOLUCION
    const { error } = await _supabase
        .from('bitacora')
        .insert([{ 
            id_libro: idLibro, 
            id_usuario: idEmpleado, 
            tipo_movimiento: 'DEVOLUCION' 
        }]);

    if (error) {
        Swal.fire({
            title: 'Error al devolver',
            text: error.message,
            icon: 'error'
        });
        return;
    }

    // 3. Éxito: Alerta que se cierra sola en 2 segundos
    await Swal.fire({
        title: '¡Devolución exitosa!',
        text: 'Gracias por entregar el libro a tiempo.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });

    // 4. Refrescamos todo
    await descargarCatalogoCompleto(); 
    await consultarMisPrestamos();     
    if (typeof filtrarLibros === 'function') filtrarLibros();
}

async function cerrarSesion() {
    const { isConfirmed } = await Swal.fire({
        title: '¿Cerrar sesión?',
        text: "Tendrás que volver a ingresar tus credenciales.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar'
    });

    if (isConfirmed) {
        const { error } = await _supabase.auth.signOut();
        
        if (error) {
            Swal.fire('Error', 'No se pudo cerrar la sesión: ' + error.message, 'error');
        } else {
            // Limpiamos cualquier rastro y redirigimos al login
            window.location.href = 'index.html';
        }
    }
}
// Aquí ya no necesitamos debounce (a menos que el array sea de 10,000 libros)
// porque la búsqueda en un array de JS es extremadamente rápida.
searchInput.addEventListener('input', filtrarLibros);