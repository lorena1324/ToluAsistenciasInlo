// Este archivo puede contener funciones auxiliares para el registro
// Por ahora, la lógica principal está en app.js

/**
 * Función auxiliar para validar datos antes de enviar
 */
function validarDatos(data) {
  const camposRequeridos = ["ID", "UsuarioEmail", "UsuarioNombre", "Operacion"];

  for (const campo of camposRequeridos) {
    if (!data[campo] || data[campo].trim() === "") {
      return { valido: false, mensaje: `El campo ${campo} es requerido` };
    }
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.UsuarioEmail)) {
    return { valido: false, mensaje: "El email no tiene un formato válido" };
  }

  return { valido: true };
}

/**
 * Función para formatear la fecha y hora
 */
function formatearFechaHora(fecha) {
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const año = d.getFullYear();
  const horas = String(d.getHours()).padStart(2, "0");
  const minutos = String(d.getMinutes()).padStart(2, "0");
  const segundos = String(d.getSeconds()).padStart(2, "0");

  return `${dia}/${mes}/${año} ${horas}:${minutos}:${segundos}`;
}

// Exportar funciones si se usa como módulo
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    validarDatos,
    formatearFechaHora,
  };
}
