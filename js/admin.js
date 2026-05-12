// 1. Inicialización de Supabase (Usa las constantes de tu config.js)
const _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// 2. Ejecución al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    // Verificación de Seguridad: Si no hay sesión, al login
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // Mostrar el nombre del Admin en la navbar
    const userDisplayName = session.user.user_metadata.full_name || session.user.email.split('@')[0];
    const displayElement = document.getElementById('userNameDisplay');
    if (displayElement) displayElement.textContent = `Admin: ${userDisplayName}`;

    // Cargar la tabla
    cargarInventarioGeneral();
});

// 3. Función principal para la tabla de administración
async function cargarInventarioGeneral() {
    const tableBody = document.getElementById('inventoryTableBody');
    if (!tableBody) return;

    // Consultamos la VISTA (trae datos unidos y ordenados de Supabase)
    const { data: inventario, error } = await _supabase
        .from('vista_inventario_general')
        .select('*');

    if (error) {
        console.error("Error al consultar la vista:", error.message);
        return;
    }

    tableBody.innerHTML = '';

    inventario.forEach(item => {
        let statusTag = '<span class="badge bg-success">Disponible</span>';
        let colaboradorInfo = '<span class="text-muted">---</span>';
        let tiempoTexto = '<span class="text-muted">---</span>';
        let rowClass = '';

        if (!item.disponible) {
            statusTag = '<span class="badge bg-warning text-dark">Prestado</span>';
            
            // Usamos los nombres de columna de la nueva vista SQL
            const nombre = item.colaborador_nombre || "Usuario sin nombre";
            colaboradorInfo = `
                <div class="fw-bold text-dark">
                    <i class="bi bi-person-circle me-1"></i> ${nombre}
                </div>
                <div class="small text-muted" style="font-size: 0.75rem;">ID: ${item.colaborador_id}</div>
            `;
            
            const diasVencimiento = 7;
            const diasRestantes = diasVencimiento - item.dias_transcurridos;

            if (diasRestantes < 0) {
                tiempoTexto = `<span class="badge bg-danger">Vencido (${Math.abs(diasRestantes)}d)</span>`;
                rowClass = 'table-danger-light';
            } else {
                tiempoTexto = `<span class="text-dark fw-medium">Quedan ${diasRestantes} días</span>`;
            }
        }

        tableBody.innerHTML += `
            <tr class="${rowClass}">
                <td class="ps-4">
                    <div class="fw-bold">${item.titulo}</div>
                    <div class="small text-muted">${item.autor}</div>
                </td>
                <td>${statusTag}</td>
                <td>${colaboradorInfo}</td>
                <td>${tiempoTexto}</td>
            </tr>
        `;
    });
}