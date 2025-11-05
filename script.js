const locations = [
  { text: "Sales de casa hacia la aventura" },
  { text: "Caminas por la acera del barrio" },
  { text: "Atraviesas un pequeño parque" },
  { text: "Pasas junto a una cafetería" },
  { text: "Llegas a un semáforo" },
  { text: "Cruzas la calle principal" },
  { text: "Atraviesas un puente sobre el río" },
  { text: "Pasas por una panadería aromática" },
  { text: "Ves una fuente en la plaza" },
  { text: "Caminas junto a un colegio" },
  { text: "Pasas por una biblioteca silenciosa" },
  { text: "Atraviesas un mercado animado" },
  { text: "Subes una pequeña cuesta" },
  { text: "Bajas por una calle empinada" },
  { text: "Pasas junto a un parque infantil" },
  { text: "Llegas a una estación de metro" },
  { text: "Caminas por un túnel" },
  { text: "Atraviesas un jardín botánico" },
  { text: "Pasas por una zona comercial" },
  { text: "Llegas a un mirador con vistas" },
  { text: "Caminas junto al río" },
  { text: "Atraviesas un bosquecillo" },
  { text: "Pasas por una iglesia antigua" },
  { text: "Llegas a una rotonda" },
  { text: "Caminas por una zona peatonal" },
  { text: "Pasas junto a un hospital" },
  { text: "Atraviesas un túnel de árboles" },
  { text: "Llegas a un centro deportivo" },
  { text: "Pasas por una estación de tren" },
  { text: "¡Has completado un gran recorrido!" },
];

let stepCount = 0;
let currentLocationIndex = 0;
let isTracking = false;
let lastAcceleration = { x: 0, y: 0, z: 0 };
let stepThreshold = 6; // Reducido para mejor detección
let lastStepTime = 0;
let stepCooldown = 250; // Milisegundos entre pasos para evitar duplicados

function startAdventure() {
  if (
    typeof DeviceMotionEvent !== "undefined" &&
    typeof DeviceMotionEvent.requestPermission === "function"
  ) {
    DeviceMotionEvent.requestPermission()
      .then((permissionState) => {
        if (permissionState === "granted") {
          initializeTracking();
        } else {
          document.getElementById("status").textContent = "❌ Permiso denegado";
        }
      })
      .catch(console.error);
  } else {
    initializeTracking();
  }
}

function initializeTracking() {
  isTracking = true;
  document.getElementById("startBtn").textContent = "Detener";
  document.getElementById("startBtn").onclick = stopAdventure;
  document.getElementById("status").textContent =
    "✅ ¡Camina para descubrir lugares!";

  window.addEventListener("devicemotion", handleMotion);
}

function stopAdventure() {
  isTracking = false;
  document.getElementById("startBtn").textContent = "Reiniciar";
  document.getElementById("startBtn").onclick = resetAdventure;
  document.getElementById("status").textContent = "⏸️ Aventura pausada";
  window.removeEventListener("devicemotion", handleMotion);
}

function resetAdventure() {
  stepCount = 0;
  currentLocationIndex = 0;
  document.getElementById("stepCount").textContent = stepCount;
  updateLocation();
  document.getElementById("startBtn").textContent = "empezar";
  document.getElementById("startBtn").onclick = startAdventure;
  document.getElementById("status").textContent =
    "Presiona el botón para comenzar";
}

function handleMotion(event) {
  if (!isTracking) return;

  const acceleration = event.accelerationIncludingGravity;

  if (acceleration) {
    // Calcular la magnitud del cambio de aceleración
    const deltaX = Math.abs(acceleration.x - lastAcceleration.x);
    const deltaY = Math.abs(acceleration.y - lastAcceleration.y);
    const deltaZ = Math.abs(acceleration.z - lastAcceleration.z);

    const totalDelta = deltaX + deltaY + deltaZ;
    
    // Control de tiempo para evitar contar el mismo paso múltiples veces
    const currentTime = Date.now();
    const timeSinceLastStep = currentTime - lastStepTime;

    // Detectar paso si supera el umbral y ha pasado suficiente tiempo
    if (totalDelta > stepThreshold && timeSinceLastStep > stepCooldown) {
      registerStep();
      createFootprint();
      lastStepTime = currentTime;
    }

    lastAcceleration = {
      x: acceleration.x,
      y: acceleration.y,
      z: acceleration.z,
    };
  }
}

function registerStep() {
  stepCount++;
  document.getElementById("stepCount").textContent = stepCount;

  // Cambiar de ubicación cada 3 pasos (antes era 5)
  if (stepCount % 3 === 0 && currentLocationIndex < locations.length - 1) {
    currentLocationIndex++;
    updateLocation();
  }
}

function updateLocation() {
  const location = locations[currentLocationIndex];
  document.getElementById("locationText").textContent = location.text;

  // Reiniciar animación
  const textEl = document.getElementById("locationText");
  textEl.style.animation = "none";
  setTimeout(() => {
    textEl.style.animation = "fadeIn 0.5s ease-in";
  }, 10);
}

function createFootprint() {
  const trail = document.getElementById("pathTrail");
  const footprint = document.createElement("div");
  footprint.className = "footprint";
  footprint.textContent = "👣";
  footprint.style.left = Math.random() * 80 + 10 + "%";
  footprint.style.top = Math.random() * 80 + 10 + "%";
  trail.appendChild(footprint);

  setTimeout(() => {
    footprint.remove();
  }, 2000);
}

// Mensaje inicial
if (window.DeviceMotionEvent) {
  document.getElementById("status").textContent =
    "📱 Presiona el botón para comenzar";
} else {
  document.getElementById("status").textContent =
    "⚠️ Tu dispositivo no soporta sensor de movimiento";
}