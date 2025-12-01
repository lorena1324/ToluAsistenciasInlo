// URL del App Script de Google para registrar datos
const APP_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwqFPlfh3lQ3Ndmv2FXCG4fnvcdHwh1NRgTTFFon2MMgpdU4vgBncvzJsMX1BXNef6g/exec";

// URL del App Script de Google para subir imágenes
const UPLOAD_IMAGE_URL =
  "https://script.google.com/macros/s/AKfycbwzL6XlO2l_nXEhSQVUBHUBt5Ca-8DYuARnzairZtnADYgI3R0iQ3Qwz7AvZRisDmBTHQ/exec";

// URL del App Script de Google para consultar registros previos
const CONSULTAR_REGISTROS_URL =
  "https://script.google.com/macros/s/AKfycbybodUT1BnYscR6hNQzQeLso_uxCMvtCO703yKPJljGpTlkK0e-mE3L3o6jJCvd7P29/exec";

// Elementos del DOM
const form = document.getElementById("registroForm");
const toggleButtons = document.querySelectorAll(".toggle-btn");
const tipoInput = document.getElementById("Tipo");
const operacionSelect = document.getElementById("Operacion");
const fotoInput = document.getElementById("foto");
const fotoPreview = document.getElementById("fotoPreview");
const fotoImg = document.getElementById("fotoImg");
const fotoURLInput = document.getElementById("FotoURL");
const mensajeDiv = document.getElementById("mensaje");
const idInput = document.getElementById("ID");
const nombreInput = document.getElementById("UsuarioNombre");
const emailInput = document.getElementById("UsuarioEmail");

// Variable para almacenar los usuarios
let usuarios = [];

// Cargar usuarios desde el archivo JSON
async function cargarUsuarios() {
  try {
    const response = await fetch("api/users.json");
    if (!response.ok) {
      throw new Error("No se pudo cargar el archivo de usuarios");
    }
    usuarios = await response.json();
    console.log("Usuarios cargados:", usuarios.length);
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    mostrarMensaje("Error al cargar la base de datos de usuarios", "error");
  }
}

// Buscar usuario por cédula
function buscarUsuarioPorCedula(cedula) {
  return usuarios.find((usuario) => usuario.cedula === cedula);
}

// Función para validar y buscar usuario
async function validarCedula(cedula) {
  if (cedula === "") {
    nombreInput.value = "";
    emailInput.value = "";
    mensajeDiv.style.display = "none";
    return false;
  }

  // Si los usuarios no están cargados, cargarlos primero
  if (usuarios.length === 0) {
    await cargarUsuarios();
  }

  const usuario = buscarUsuarioPorCedula(cedula);

  if (usuario) {
    // Usuario encontrado, llenar los campos
    nombreInput.value = usuario.nombre;
    if (usuario.email) {
      emailInput.value = usuario.email;
    }
    // Limpiar mensaje de error si existe
    mensajeDiv.style.display = "none";
    return true;
  } else {
    // Usuario no encontrado, mostrar error
    nombreInput.value = "";
    emailInput.value = "";
    mostrarMensaje(
      `Error: La cédula ${cedula} no está registrada en el sistema`,
      "error"
    );
    return false;
  }
}

// Manejar el evento cuando se ingresa la cédula (al perder el foco)
idInput.addEventListener("blur", async function () {
  await validarCedula(this.value.trim());
});

// También validar mientras se escribe (con un pequeño delay para no hacer muchas búsquedas)
let timeoutCedula;
idInput.addEventListener("input", function () {
  clearTimeout(timeoutCedula);
  const cedula = this.value.trim();

  // Si el campo está vacío, limpiar los otros campos
  if (cedula === "") {
    nombreInput.value = "";
    emailInput.value = "";
    mensajeDiv.style.display = "none";
    return;
  }

  // Esperar 500ms después de que el usuario deje de escribir
  timeoutCedula = setTimeout(async () => {
    await validarCedula(cedula);
  }, 500);
});

// Cargar usuarios al iniciar
cargarUsuarios();

// Manejo del toggle IN/OUT (actualiza el campo Tipo)
toggleButtons.forEach((btn) => {
  btn.addEventListener("click", function () {
    toggleButtons.forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    tipoInput.value = this.dataset.value;
  });
});

// Variable para almacenar el archivo de la foto
let fotoFile = null;

// Manejo de la foto
fotoInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    fotoFile = file;
    const reader = new FileReader();
    reader.onload = function (e) {
      fotoImg.src = e.target.result;
      fotoPreview.style.display = "block";
      // Limpiar la URL anterior (se subirá cuando se envíe el formulario)
      fotoURLInput.value = "";
    };
    reader.readAsDataURL(file);
  }
});

// Función para subir la imagen al App Script
async function subirImagen(file, cedula) {
  if (!file) {
    return "";
  }

  try {
    // Convertir la imagen a base64 para enviarla
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Obtener solo la parte base64 (sin el prefijo data:image/...)
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Crear un nombre único para el archivo
    const timestamp = new Date().getTime();
    const fileExtension = file.name.split(".").pop() || "jpg";
    const filename = `foto_${cedula}_${timestamp}.${fileExtension}`;
    const mimeType = file.type || "image/jpeg";

    // Preparar los datos en el formato que espera el App Script
    const uploadData = {
      fileName: filename,
      mimeType: mimeType,
      fileData: base64,
    };

    // Enviar la imagen al App Script como JSON
    // Intentamos usar 'cors' primero para poder leer la respuesta
    try {
      const response = await fetch(UPLOAD_IMAGE_URL, {
        method: "POST",
        body: JSON.stringify(uploadData),
      });

      console.log(response);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const resultado = await response.json();
      console.log(`Respuesta foto:`, resultado.downloadUrl);

      return resultado.downloadUrl;
    } catch (corsError) {
      // Si falla con CORS, intentar con no-cors (no podremos leer la respuesta)
      console.warn("CORS no disponible, usando no-cors:", corsError);
      await fetch(UPLOAD_IMAGE_URL, {
        method: "POST",
        body: JSON.stringify(uploadData),
      });
      // Con no-cors no podemos leer la respuesta, asumimos éxito
      return filename;
    }
  } catch (error) {
    console.error("Error al subir la imagen:", error);
    // Si falla la subida, retornamos un string vacío
    return "";
  }
}

// Función para calcular la diferencia de horas entre dos fechas en formato "horas:minutos"
function calcularDiferenciaHoras(fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diferenciaMs = fin - inicio;

  // Calcular horas y minutos
  const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
  const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));

  // Formatear como "horas:minutos"
  return `${horas}:${minutos.toString().padStart(2, "0")} h`;
}

// Función para calcular horas extra (diferencia sobre 8 horas)
function calcularHorasExtra(tiempoCalculado) {
  if (!tiempoCalculado || !tiempoCalculado.start || !tiempoCalculado.end) {
    return "";
  }

  const inicio = new Date(tiempoCalculado.start);
  const fin = new Date(tiempoCalculado.end);
  const diferenciaMs = fin - inicio;

  // Calcular el total de horas (incluyendo minutos como fracción)
  const totalHoras = diferenciaMs / (1000 * 60 * 60);

  // Si el total es 8 horas o menos, no hay horas extra
  if (totalHoras <= 8) {
    return "";
  }

  // Calcular la diferencia sobre 8 horas
  const horasExtra = totalHoras - 8;

  // Calcular horas y minutos de las horas extra
  const horas = Math.floor(horasExtra);
  const minutos = Math.floor((horasExtra - horas) * 60);

  // Formatear como "horas:minutos h"
  return `${horas}:${minutos.toString().padStart(2, "0")} h`;
}

// Función para procesar los registros previos y calcular horas si es ENTRADA
function procesarRegistrosPrevios(resultado) {
  if (!resultado || !resultado.success || !resultado.data) {
    return null;
  }

  const data = resultado.data;

  // Si el registro previo es ENTRADA, calcular la diferencia de horas
  if (data.columna5 === "ENTRADA" && data.columna6) {
    const start = data.columna6;
    const end = new Date().toISOString(); // Fecha actual
    const time = calcularDiferenciaHoras(start, end);

    return {
      start: start,
      end: end,
      time: time, // Formato "horas:minutos h"
    };
  }

  return null;
}

// Función para consultar registros previos por ID
async function consultarRegistrosPrevios(cedula) {
  try {
    const response = await fetch(CONSULTAR_REGISTROS_URL, {
      method: "POST",
      body: JSON.stringify({ id: cedula }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const resultado = await response.json();
    console.log("Respuesta registros previos:", resultado);

    // Procesar el resultado y calcular horas si es ENTRADA
    const tiempoCalculado = procesarRegistrosPrevios(resultado);
    if (tiempoCalculado) {
      console.log("Tiempo calculado:", tiempoCalculado);
      return {
        ...resultado,
        tiempoCalculado: tiempoCalculado,
      };
    }

    return resultado;
  } catch (error) {
    console.error("Error al consultar registros previos:", error);
    // Si falla, intentar con no-cors
    try {
      await fetch(CONSULTAR_REGISTROS_URL, {
        method: "POST",
        body: JSON.stringify({ id: cedula }),
      });
      // Con no-cors no podemos leer la respuesta
      return null;
    } catch (noCorsError) {
      console.error("Error con no-cors:", noCorsError);
      return null;
    }
  }
}

// Función para mostrar mensaje
function mostrarMensaje(texto, tipo = "success") {
  mensajeDiv.textContent = texto;
  mensajeDiv.style.display = "block";
  mensajeDiv.style.backgroundColor = tipo === "success" ? "#d1fae5" : "#fee2e2";
  mensajeDiv.style.color = tipo === "success" ? "#065f46" : "#991b1b";

  setTimeout(() => {
    mensajeDiv.style.display = "none";
  }, 5000);
}

// Manejo del envío del formulario
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const cedula = idInput.value.trim();

  // Validar que la cédula esté registrada antes de enviar
  if (usuarios.length === 0) {
    await cargarUsuarios();
  }

  const usuario = buscarUsuarioPorCedula(cedula);
  if (!usuario) {
    mostrarMensaje(
      `Error: La cédula ${cedula} no está registrada. No se puede enviar el registro.`,
      "error"
    );
    idInput.focus();
    return;
  }

  // Deshabilitar el botón mientras se envía
  const submitBtn = form.querySelector(".save-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Consultando registros previos...";

  let tiempoCalculado = null;

  try {
    // Consultar registros previos antes de continuar
    submitBtn.textContent = "Consultando registros previos...";
    const registrosPrevios = await consultarRegistrosPrevios(cedula);

    if (registrosPrevios) {
      // Mostrar información sobre registros previos si existen
      if (registrosPrevios.data && registrosPrevios.data.encontrado) {
        const data = registrosPrevios.data;
        console.log("Registro previo encontrado:", data);

        // Si hay tiempo calculado (registro ENTRADA), guardarlo y mostrarlo
        if (registrosPrevios.tiempoCalculado) {
          tiempoCalculado = registrosPrevios.tiempoCalculado;
          console.log(
            `Tiempo transcurrido desde ENTRADA: ${tiempoCalculado.time}`
          );
          mostrarMensaje(
            `Registro previo ENTRADA encontrado. Tiempo transcurrido: ${tiempoCalculado.time}`,
            "success"
          );
        } else {
          mostrarMensaje(
            "Registro previo encontrado. Continuando con el nuevo registro...",
            "success"
          );
        }
      } else {
        console.log("Usuario no tiene registros previos");
      }
    }
  } catch (error) {
    console.error("Error al consultar registros previos:", error);
    // Continuar con el proceso aunque falle la consulta
    mostrarMensaje(
      "No se pudo consultar registros previos, pero se continuará con el registro.",
      "success"
    );
  }

  submitBtn.textContent = "Subiendo imagen...";

  let fotoURL = "";

  try {
    // Primero subir la imagen si existe
    if (fotoFile) {
      submitBtn.textContent = "Subiendo imagen...";
      fotoURL = await subirImagen(fotoFile, cedula);
    }

    // Obtener fecha y hora actual
    const ahora = new Date();
    const fechaHora = ahora.toISOString();

    // Obtener los valores correctos del formulario
    const tipoValue = tipoInput.value;
    const operacionValue = operacionSelect.value;

    // Preparar el valor de LatLong: usar el tiempo calculado si existe, sino vacío
    const latLongValue = tiempoCalculado ? tiempoCalculado.time : "";

    // Calcular horas extra si el tiempo supera las 8 horas
    const extraValue = tiempoCalculado
      ? calcularHorasExtra(tiempoCalculado)
      : "";
    // Preparar los datos
    const data = {
      ID: cedula,
      UsuarioEmail: emailInput.value || usuario.email || "",
      UsuarioNombre: nombreInput.value || usuario.nombre,
      Operacion: operacionValue || "",
      Tipo: tipoValue || "",
      fechaHora: fechaHora,
      FotoURL: fotoURL,
      LatLong: latLongValue,
      Comentario: document.getElementById("Comentario").value || "",
      Extra: extraValue,
    };

    submitBtn.textContent = "Enviando registro...";

    // Enviar datos al App Script como JSON
    // El App Script espera recibir un objeto 'data' con los campos especificados
    console.log("Datos a enviar:", data);
    const response = await fetch(APP_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(data),
    });
    console.log("Respuesta envío:", response);
    const resultado = await response.json();
    console.log("Resultado envío:", resultado);
    // Con no-cors no podemos leer la respuesta, pero asumimos éxito
    // Mostrar mensaje de éxito
    mostrarMensaje("Registro enviado correctamente", "success");

    // Limpiar el formulario después de 2 segundos
    setTimeout(() => {
      form.reset();
      fotoPreview.style.display = "none";
      fotoImg.src = "";
      fotoFile = null;
      toggleButtons[0].classList.add("active");
      toggleButtons[1].classList.remove("active");
      tipoInput.value = "ENTRADA";
    }, 2000);
  } catch (error) {
    console.error("Error al enviar:", error);
    mostrarMensaje(
      "Error al enviar el registro. Por favor, intente nuevamente.",
      "error"
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Guardar Registro";
  }
});
