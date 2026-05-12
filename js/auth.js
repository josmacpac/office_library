// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// Referencias a los formularios
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// ==========================================
// 2. LISTENERS (Escuchadores)
// ==========================================

// Listener para el Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    ejecutarLogin();
});

// Listener para el Registro
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    ejecutarRegistro();
});

// ==========================================
// 3. FUNCIONES QUE EJECUTAN LA INFO
// ==========================================

async function ejecutarLogin() {
    const id = document.getElementById('employeeId').value;
    const pass = document.getElementById('password').value;
    const fakeEmail = `${id}@biblioteca.local`;

    const { data, error } = await _supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: pass
    });

    if (error) {
        alert("Error: ID o contraseña incorrectos");
    } else {
        console.log("Sesión iniciada:", data.user);
        window.location.href = 'dashboard.html'; 
    }
}

async function ejecutarRegistro() {
    const id = document.getElementById('regEmployeeId').value;
    const nombre = document.getElementById('regFullName').value;
    const pass = document.getElementById('regPassword').value;
    const confirmPass = document.getElementById('regConfirmPassword').value; // Nuevo
    const termsAccepted = document.getElementById('termsCheck').checked; // Nuevo

    const statusDiv = document.getElementById('registerStatus');
    statusDiv.classList.remove('d-none');

    // VALIDACIÓN 1: ¿Coinciden las contraseñas?
    if (pass !== confirmPass) {
        statusDiv.textContent = "Error: Las contraseñas no coinciden.";
        statusDiv.className = "alert alert-danger mt-3";
        return; // Detenemos la ejecución
    }

    // VALIDACIÓN 2: ¿Aceptó términos? (Aunque el 'required' del HTML ayuda, esto es más seguro)
    if (!termsAccepted) {
        statusDiv.textContent = "Error: Debes aceptar los términos y condiciones.";
        statusDiv.className = "alert alert-danger mt-3";
        return;
    }

    // Si todo está bien, procedemos con Supabase
    const fakeEmail = `${id}@biblioteca.local`;

    const { data, error } = await _supabase.auth.signUp({
        email: fakeEmail,
        password: pass,
        options: {
            data: { full_name: nombre }
        }
    });

    if (error) {
        statusDiv.textContent = "Error: " + error.message;
        statusDiv.className = "alert alert-danger mt-3";
    } else {
        statusDiv.textContent = "¡Registro exitoso! Ya puedes iniciar sesión.";
        statusDiv.className = "alert alert-success mt-3";
        registerForm.reset();
    }
}