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
let isMoving = false;

// Variables para detección de pasos mejorada
let accelerationHistory = [];
let historySize = 10;
let peakThreshold = 1.5;
let lastStepTime = 0;
let stepCooldown = 300;
let lastMovementTime = 0;
let movementTimeout = 1500; // Tiempo sin movimiento para considerar "quieto"

// Detectar si es Android o iOS
const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

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
  accelerationHistory = [];
  document.getElementById("startBtn").textContent = "Detener";
  document.getElementById("startBtn").onclick = stopAdventure;
  
  let deviceInfo = isAndroid ? " (Android)" : isIOS ? " (iOS)" : "";
  document.getElementById("status").textContent =
    "✅ ¡Camina para descubrir lugares!" + deviceInfo;

  updateMovementStatus(false);
  window.addEventListener("devicemotion", handleMotion);
  
  // Comprobar periódicamente si se ha detenido
  setInterval(checkMovementStatus, 200);
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
  accelerationHistory = [];
  isMoving = false;
  document.getElementById("stepCount").textContent = "quieto";
  updateLocation();
  document.getElementById("startBtn").textContent = "empezar";
  document.getElementById("startBtn").onclick = startAdventure;
  document.getElementById("status").textContent =
    "Presiona el botón para comenzar";
}

function handleMotion(event) {
  if (!isTracking) return;

  const acceleration = event.accelerationIncludingGravity;

  if (acceleration && acceleration.x !== null && acceleration.y !== null && acceleration.z !== null) {
    const magnitude = Math.sqrt(
      acceleration.x * acceleration.x +
      acceleration.y * acceleration.y +
      acceleration.z * acceleration.z
    );

    accelerationHistory.push(magnitude);
    
    if (accelerationHistory.length > historySize) {
      accelerationHistory.shift();
    }

    if (accelerationHistory.length >= historySize) {
      detectStep();
    }
  }
}

function detectStep() {
  const currentTime = Date.now();
  const timeSinceLastStep = currentTime - lastStepTime;

  if (timeSinceLastStep < stepCooldown) {
    return;
  }

  const avg = accelerationHistory.reduce((a, b) => a + b, 0) / accelerationHistory.length;
  const variance = accelerationHistory.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / accelerationHistory.length;
  const stdDev = Math.sqrt(variance);

  const recent = accelerationHistory.slice(-3);
  const middle = recent[1];

  const isPeak = middle > recent[0] && middle > recent[2];
  const threshold = isAndroid ? 1.2 : 1.5;

  if (isPeak && stdDev > threshold) {
    registerStep();
    createFootprint();
    lastStepTime = currentTime;
    lastMovementTime = currentTime;
    
    if (!isMoving) {
      isMoving = true;
      updateMovementStatus(true);
    }
  }
}

function checkMovementStatus() {
  if (!isTracking) return;
  
  const currentTime = Date.now();
  const timeSinceLastMovement = currentTime - lastMovementTime;
  
  if (isMoving && timeSinceLastMovement > movementTimeout) {
    isMoving = false;
    updateMovementStatus(false);
  }
}

function updateMovementStatus(moving) {
  const statusEl = document.getElementById("stepCount");
  if (moving) {
    statusEl.textContent = "en movimiento";
    statusEl.style.color = "#4ade80"; // verde
  } else {
    statusEl.textContent = "quieto";
    statusEl.style.color = "#94a3b8"; // gris
  }
}

function registerStep() {
  stepCount++;

  // Cambiar de ubicación cada 3 pasos
  if (stepCount % 3 === 0 && currentLocationIndex < locations.length - 1) {
    currentLocationIndex++;
    updateLocation();
  }
}

function updateLocation() {
  const location = locations[currentLocationIndex];
  document.getElementById("locationText").textContent = location.text;

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
    "Presiona el botón para comenzar";
} else {
  document.getElementById("status").textContent =
    "⚠️ Tu dispositivo no soporta sensor de movimiento";
}