const locations = [
  { text: "Las que somos hijas de ese mundo, aquellas que llevamos aún, orgullosas, la tierra bajo las uñas, reclamamos aquí, ahora, el relato político de nuestro origen." },
  { text: "Nos gustaba la casa porque aparte de espaciosa y antigua [...] guardaba los recuerdos de nuestros bisabuelos, el abuelo paterno, nuestros padres y toda la infancia." },
  { text: "La ciudad sigue dependiendo de quienes cada día la atraviesan para sostenerla, aunque no siempre puedan disfrutar de ella en las mismas condiciones." },
  { text: "El rebusco, práctica mediante la que campesinos y jornaleros recogían aceitunas y bellotas sobrantes en tierras privadas como último recurso para sostenerse." },
  { text: "lo que se deja atrás cuando te alejas de un lugar" },
  { text: "lo que el paso del tiempo transforma" },
  { text: "lo que viaja contigo a través del recuerdo" },
  { text: "Aquí encontramos luz y ropa tendida mostrando esperanza y resistencia de los que se quedan." },
  { text: "Volver no es solo un viaje físico de regreso a las raíces, sino un movimiento sobre lo que permanece." },
  { text: "Todo lo que no se desea en el centro, se expulsa." },
  { text: "Me interesa mucho menos saber «quién soy» que entender «de dónde vengo»." },
  { text: "El relato sobre mis orígenes se escribe en primera persona del plural y afirma que venimos del barrio y que al barrio llegamos de los pueblos." },
  { text: "Escribir, pues, desde la pérdida para no olvidar de dónde venimos y para que el lugar adonde hemos llegado no nos nuble la capacidad de vislumbrar una biografía colectiva compartida con toda una generación." },
  { text: "A ese acento de pueblo, que no se parece al habla de mi barrio, yo lo llamo «casa»." },
  { text: "¿Qué es el campo?\nNo sé qué es el campo." },
  { text: "Quizás el campo —como el cuenco— no sea un lugar, sino una forma de contener el mundo." },
  { text: "El desplazamiento responde a la búsqueda de pastos más frescos y a los ciclos estacionales que han marcado históricamente los tiempos y las formas de la trashumancia." },
  { text: "Mientras unos cuerpos se desplazan y trashuman, otros permanecen a la espera de su regreso, acompasando sus propios ciclos a los cambios estacionales." },
  { text: "La vida continúa desarrollándose más allá de aquello que acontece en primer plano." },
  { text: "¿Cómo generar formas de encuentro en un contexto atravesado por el desencuentro, el cansancio social, la falta de recursos y la aceleración constante?" },
  { text: "Un homenaje a los que esperaron la espiga, los que fueron arrancados de su tierra, los que cuentan su historia para que nos acompañe como telón de fondo." },
  { text: "Este trabajo de recuperación de esta memoria no es un ejercicio de nostalgia, sino una herramienta para el presente." },
  { text: "Nos preguntamos qué hacemos con esa herencia: [...] no desde la nostalgia ni desde la conservación de estas prácticas como piezas de museo, sino pensando qué pueden significar hoy y cómo pueden volver a activar vínculos y comunidades." },
  { text: "Regresar al territorio de origen, con lo aprendido y con otra mirada, no es un paso atrás, sino un paso adelante." },
  { text: "Es tiempo de volver y reinventar un nuevo imaginario de lo rural que nos permita florecer en nuestro suelo." },
  { text: "Su lana, material considerado un residuo y que ya nadie quiere, para nosotras es la manera de hablar un territorio, una cultura y un calor que hay que recuperar." },
];

const MIN_STEPS_PER_TEXT = 4;
const WORDS_PER_STEP = 2;

let stepCount = 0;
let stepsSinceChange = 0;
let stepsNeeded = MIN_STEPS_PER_TEXT;
let deck = [];
let currentLocationIndex = null;
let isTracking = false;
let isMoving = false;
let manualMode = false;
let wakeLock = null;

let accelerationHistory = [];
const historySize = 10;
let smoothed = null;
const SMOOTHING = 0.2;
let lastStepTime = 0;
const stepCooldown = 300;
let lastMovementTime = 0;
const movementTimeout = 1500;
let movementCheckInterval = null;
let motionEventReceived = false;

const isAndroid = /Android/i.test(navigator.userAgent);

function nextIndex() {
  if (deck.length === 0) {
    deck = [...locations.keys()];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    if (deck[deck.length - 1] === currentLocationIndex) deck.reverse();
  }
  return deck.pop();
}

function stepsFor(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(MIN_STEPS_PER_TEXT, Math.ceil(words / WORDS_PER_STEP));
}

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    }
  } catch (err) {
    console.warn("Wake Lock no disponible:", err);
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && (isTracking || manualMode)) {
    requestWakeLock();
  }
});

function startAdventure() {
  if (!window.DeviceMotionEvent) {
    startManualMode("sin sensor de movimiento");
    return;
  }

  if (typeof DeviceMotionEvent.requestPermission === "function") {
    DeviceMotionEvent.requestPermission()
      .then((permissionState) => {
        if (permissionState === "granted") {
          initializeTracking();
        } else {
          startManualMode("permiso denegado");
        }
      })
      .catch((error) => {
        console.error(error);
        startManualMode("no se pudo activar el sensor");
      });
  } else {
    initializeTracking();
  }
}

function startManualMode(reason) {
  manualMode = true;
  stopSensor();

  if (currentLocationIndex === null) {
    showNextLocation();
  }

  const startBtn = document.getElementById("startBtn");
  startBtn.textContent = "reiniciar";
  startBtn.onclick = resetAdventure;

  setStatus(reason ? `${reason} - toca el texto para avanzar` : "toca el texto para avanzar");
  requestWakeLock();
}

function handleTap() {
  if (currentLocationIndex === null) return;
  if (!isTracking && !manualMode) return;
  showNextLocation();
}

function stopSensor() {
  isTracking = false;
  window.removeEventListener("devicemotion", handleMotion);
  if (movementCheckInterval) {
    clearInterval(movementCheckInterval);
    movementCheckInterval = null;
  }
  const indicator = document.getElementById("statusIndicator");
  indicator.classList.remove("moving", "stopped");
}

function initializeTracking() {
  isTracking = true;
  accelerationHistory = [];
  smoothed = null;

  if (currentLocationIndex === null) {
    showNextLocation();
  }

  const startBtn = document.getElementById("startBtn");
  startBtn.textContent = "detener";
  startBtn.onclick = stopAdventure;
  setStatus("camina");

  updateMovementStatus(false);
  window.addEventListener("devicemotion", handleMotion);
  requestWakeLock();

  if (movementCheckInterval) clearInterval(movementCheckInterval);
  movementCheckInterval = setInterval(checkMovementStatus, 200);

  motionEventReceived = false;
  setTimeout(() => {
    if (isTracking && !motionEventReceived) {
      startManualMode("no llegan datos del sensor");
    }
  }, 3000);
}

function stopAdventure() {
  isTracking = false;
  window.removeEventListener("devicemotion", handleMotion);
  releaseWakeLock();

  const startBtn = document.getElementById("startBtn");
  startBtn.textContent = "continuar";
  startBtn.onclick = startAdventure;
  setStatus("pausado");

  isMoving = false;
  updateMovementStatus(false);

  if (movementCheckInterval) {
    clearInterval(movementCheckInterval);
    movementCheckInterval = null;
  }
}

function resetAdventure() {
  stopSensor();
  manualMode = false;
  releaseWakeLock();

  stepCount = 0;
  stepsSinceChange = 0;
  stepsNeeded = MIN_STEPS_PER_TEXT;
  currentLocationIndex = null;
  deck = [];
  accelerationHistory = [];
  smoothed = null;
  lastStepTime = 0;
  lastMovementTime = 0;
  isMoving = false;

  document.getElementById("locationText").textContent = "...";
  const startBtn = document.getElementById("startBtn");
  startBtn.textContent = "empezar";
  startBtn.onclick = startAdventure;
  setStatus("");
}

function handleMotion(event) {
  if (!isTracking) return;

  const a = event.accelerationIncludingGravity;
  if (!a || a.x === null || a.y === null || a.z === null) return;

  if (!motionEventReceived) {
    motionEventReceived = true;
    setStatus("camina");
  }

  const magnitude = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);

  smoothed = smoothed === null ? magnitude : smoothed + SMOOTHING * (magnitude - smoothed);

  accelerationHistory.push(smoothed);
  if (accelerationHistory.length > historySize) accelerationHistory.shift();

  if (accelerationHistory.length >= historySize) detectStep();
}

function detectStep() {
  const now = Date.now();
  if (now - lastStepTime < stepCooldown) return;

  const n = accelerationHistory.length;
  const avg = accelerationHistory.reduce((s, v) => s + v, 0) / n;
  const variance = accelerationHistory.reduce((s, v) => s + (v - avg) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  const [a, b, c] = accelerationHistory.slice(-3);
  const threshold = isAndroid ? 1.2 : 1.5;

  const isPeak = b > a && b > c && b > avg + threshold * 0.5;

  if (isPeak && stdDev > threshold) {
    registerStep();
    lastStepTime = now;
    lastMovementTime = now;

    if (!isMoving) {
      isMoving = true;
      updateMovementStatus(true);
    }
  }
}

function checkMovementStatus() {
  if (!isTracking) return;
  if (isMoving && Date.now() - lastMovementTime > movementTimeout) {
    isMoving = false;
    updateMovementStatus(false);
  }
}

function updateMovementStatus(moving) {
  const indicator = document.getElementById("statusIndicator");
  indicator.classList.toggle("moving", moving);
  indicator.classList.toggle("stopped", !moving);
}

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

function registerStep() {
  stepCount++;
  stepsSinceChange++;

  if (stepsSinceChange >= stepsNeeded) {
    showNextLocation();
  }
}

function showNextLocation() {
  currentLocationIndex = nextIndex();
  stepsSinceChange = 0;
  stepsNeeded = stepsFor(locations[currentLocationIndex].text);
  updateLocation();
}

function updateLocation() {
  const location = locations[currentLocationIndex];
  const locationText = document.getElementById("locationText");

  locationText.style.opacity = "0";
  setTimeout(() => {
    locationText.textContent = location.text;
    locationText.style.opacity = "1";
  }, 300);
}

document.addEventListener("DOMContentLoaded", function () {
  const startBtn = document.getElementById("startBtn");
  startBtn.onclick = startAdventure;

  document.querySelector(".location-display").addEventListener("click", handleTap);
});