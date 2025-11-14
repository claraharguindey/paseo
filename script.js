const locations = [
 { text: "El suelo del parque está cubierto de hojas de haya" },
 { text: "Atraviesas el antiguo monumento en ruinas" },
 { text: "Cruzas los soportales junto a la plaza del ayuntamiento" },
 { text: "Vislumbras una montaña en el horizonte, a lo lejos" },
{ text: "Alguien está voceando, busca a un perrito llamado Pinky" },
 { text: "Te detienes frente a la entrada de un jardín cercado" },
 { text: "Cruzas la avenida principal, llena de tiendas con escaparates" },
 { text: "Atraviesas un puente de piedra sobre el río" },
 { text: "Se acerca una nube con forma de osito de gominola" },
 { text: "Recoges unas castañas del suelo y las pelas por el camino" },
{ text: "Te cruzas con una antigua profesora que te hacía la vida imposible" },
 { text: "Pasas junto a una tienda de chucherías, te apetece regaliz" },
 { text: "Un hombre vestido de hechicero cruza rápidamente el paso de peatones" },
 { text: "Pasas junto a un gran colegio de ladrillo; hay niños jugando" },
 { text: "Atraviesas el parque infantil, te apetece montarte en los columpios" },
 { text: "Te acercas a la entrada del museo, va a haber una nueva exposición" },
 { text: "Al otro lado de una colina se distingue un bosque" },
 { text: "Pasas junto al supermercado, te apetece comprar cereales" },
 { text: "Alguien te reparte un flyer de un recital poético" },
 { text: "Te cruzas con una cantante famosa, pero no recuerdas cómo se llama" },
 { text: "Parece que el circo se acerca a la ciudad" },
 { text: "Una familia de patos atraviesa la calle en dirección al parque" },
{ text: "Un gato te mira desde un balcón, parece lleno de sabiduría" },
 { text: "Pasas junto a la biblioteca pública y aprovechas para sacar un libro" },
 { text: "Atraviesas un pequeño mercado de productos artesanales" },
{ text: "Te cruzas con un político local, parece de buen humor" },
{ text: "Recoges unas moras, quizás hoy hagas mermelada con ellas" },
{ text: "Te cruzas con un cartel de “Se busca”, aparece tu abuela" },
{ text: "Tiras una roca plana a un estanque y consigues que de tres saltos" },
 { text: "Subes una pequeña pendiente, desde arriba hay una vista preciosa" },
 { text: "Te cruzas con un perro muy pequeño que ladra muy fuerte" },
{ text: "Pasas junto al museo, hay una exposición sobre la historia de la sopa" },
 { text: "Un gato sale de unos arbustos y te pega un buen susto" },
 { text: "Encuentras la casa abandonada, miras suspicaz por una ventanita" },
 { text: "Pasas junto a un puesto de perritos calientes, pero tienes el estómago fatal" },
 { text: "Distingues un niño de cigüeña en lo alto de un campanario" },
 { text: "Pasas junto a una panadería que huele muy bien, te da hambre" },
];



let stepCount = 0;
let currentLocationIndex = 0;
let isTracking = false;
let isMoving = false;

let accelerationHistory = [];
let historySize = 10;
let lastStepTime = 0;
let stepCooldown = 300;
let lastMovementTime = 0;
let movementTimeout = 1500;

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
  document.getElementById("startBtn").textContent = "detener";
  document.getElementById("startBtn").onclick = stopAdventure;
  
  updateMovementStatus(false);
  window.addEventListener("devicemotion", handleMotion);
  
  setInterval(checkMovementStatus, 200);
}

function stopAdventure() {
  isTracking = false;
  document.getElementById("startBtn").textContent = "reiniciar";
  document.getElementById("startBtn").onclick = resetAdventure;
  window.removeEventListener("devicemotion", handleMotion);
  updateMovementStatus(false);
}

function resetAdventure() {
  stepCount = 0;
  currentLocationIndex = 0;
  accelerationHistory = [];
  isMoving = false;
  updateLocation();
  document.getElementById("startBtn").textContent = "empezar";
  document.getElementById("startBtn").onclick = startAdventure;
  
  const indicator = document.getElementById("statusIndicator");
  indicator.classList.remove("moving", "stopped");
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
  const indicator = document.getElementById("statusIndicator");
  
  if (moving) {
    indicator.classList.remove("stopped");
    indicator.classList.add("moving");
  } else {
    indicator.classList.remove("moving");
    indicator.classList.add("stopped");
  }
}

function registerStep() {
  stepCount++;

  if (stepCount % 3 === 0 && currentLocationIndex < locations.length - 1) {
    currentLocationIndex++;
    updateLocation();
  }
}

function updateLocation() {
  const location = locations[currentLocationIndex];
  document.getElementById("locationText").textContent = location.text;
}

if (window.DeviceMotionEvent) {
  document.getElementById("status").textContent = "presiona el botón para comenzar";
} else {
  document.getElementById("status").textContent = "tu dispositivo no soporta sensor de movimiento";
}