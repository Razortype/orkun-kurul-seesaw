// Parameters
const COLORS = [
  "#ef4444",
  "#60a5fa",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#8b5cf6",
  "#6366f1",
  "#dc2626",
  "#d946ef",
  "#3b82f6",
];
const MAX_ANGLE = 30;
const PLANK_LENGTH = 400;
const GRAVITY = 0.5;

// State
const state = {
  weights: [],
  falling: [],
  paused: false,
  weightMode: "random",
  fixedWeight: 5,
  nextWeight: null,
};

// Referances
const elements = {
  playground: document.getElementById("playground"),
  nextWeightBox: document.getElementById("next-weight-box"),
  plank: document.getElementById("plank"),
  leftWeight: document.getElementById("left-weight"),
  rightWeight: document.getElementById("right-weight"),
  tiltAngle: document.getElementById("tilt-angle"),
  netTorque: document.getElementById("net-torque"),
  leftCount: document.getElementById("left-count"),
  rightCount: document.getElementById("right-count"),
  resetBtn: document.getElementById("reset-btn"),
  undoBtn: document.getElementById("undo-btn"),
  pauseBtn: document.getElementById("pause-btn"),
  pauseBanner: document.getElementById("pause-banner"),
  dropLog: document.getElementById("drop-log"),
  modeRandomBtn: document.getElementById("mode-random"),
  modeFixedBtn: document.getElementById("mode-fixed"),
  stepperWrapper: document.getElementById("fixed-stepper-wrapper"),
  weightDecreaseBtn: document.getElementById("weight-decrease"),
  weightIncreaseBtn: document.getElementById("weight-increase"),
  fixedWeightValue: document.getElementById("fixed-weight-value"),
};

// Register Events
elements.playground.addEventListener("click", handlePlaygroundClick);
elements.resetBtn.addEventListener("click", handleReset);
elements.undoBtn.addEventListener("click", handleUndo);
elements.pauseBtn.addEventListener("click", handlePause);
elements.modeRandomBtn.addEventListener("click", () => setWeightMode("random"));
elements.modeFixedBtn.addEventListener("click", () => setWeightMode("fixed"));
elements.weightDecreaseBtn.addEventListener("click", () =>
  adjustFixedWeight(-1),
);
elements.weightIncreaseBtn.addEventListener("click", () =>
  adjustFixedWeight(1),
);

function handlePlaygroundClick(e) {
  if (state.paused) return;

  const pgRect = elements.playground.getBoundingClientRect();
  const plankRect = elements.plank.getBoundingClientRect();
  const plankCenter = plankRect.left + plankRect.width / 2;
  const distanceFromPivot = e.clientX - plankCenter;
  const absDistance = Math.abs(distanceFromPivot);
  const isOverPlank =
    absDistance <= plankRect.width / 2 && e.clientY < plankRect.top;
  const side = distanceFromPivot < 0 ? "left" : "right";
  const posX = e.clientX - pgRect.left;
  const posY = e.clientY - pgRect.top;

  if (isOverPlank) {
    const weight = getNextWeight();
    dropWeight(posX, posY, distanceFromPivot, weight, side);
  }
}

function dropWeight(posX, posY, distance, weight, side) {
  const edge = 20 + weight * 4;
  const weightElement = spawnWeight(posX, posY, weight, edge);
  state.falling.push({
    element: weightElement,
    posX,
    posY,
    vy: 0,
    edge,
    weight,
    distance,
    side,
  });
}

function getNextWeight() {
  const weight = state.nextWeight;

  state.nextWeight = computeNextWeight();
  renderNextWeight();

  return weight;
}

function computeNextWeight() {
  return state.weightMode === "fixed"
    ? state.fixedWeight
    : Math.floor(Math.random() * 10) + 1;
}

function renderNextWeight() {
  elements.nextWeightBox.innerText = `${state.nextWeight} kg`;
  elements.nextWeightBox.style.backgroundColor = COLORS[state.nextWeight - 1];
}

function spawnWeight(posX, posY, weight, edge) {
  const weightElement = document.createElement("div");
  weightElement.classList.add("weight");
  weightElement.innerText = `${weight}kg`;
  weightElement.style.left = `${posX - edge / 2}px`;
  weightElement.style.top = `${posY - edge / 2}px`;
  weightElement.style.backgroundColor =
    COLORS[Math.min(weight - 1, COLORS.length - 1)];
  weightElement.style.width = `${edge}px`;
  weightElement.style.height = `${edge}px`;
  elements.playground.appendChild(weightElement);
  return weightElement;
}

function computeStats() {
  let leftWeight = 0,
    rightWeight = 0;
  let leftCount = 0,
    rightCount = 0;
  let totalTorque = 0;

  for (const { weight, distance, side } of state.weights) {
    if (side === "left") {
      leftWeight += weight;
      leftCount++;
    } else {
      rightWeight += weight;
      rightCount++;
    }
    totalTorque += weight * distance;
  }

  const angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, totalTorque / 10));

  return {
    leftWeight,
    rightWeight,
    leftCount,
    rightCount,
    netTorque: totalTorque,
    angle,
  };
}

function renderStats() {
  const stats = computeStats();

  elements.leftWeight.innerText = `${stats.leftWeight}kg`;
  elements.rightWeight.innerText = `${stats.rightWeight}kg`;
  elements.leftCount.innerText = `${stats.leftCount}`;
  elements.rightCount.innerText = `${stats.rightCount}`;
  elements.tiltAngle.innerText = `${stats.angle.toFixed(1)}°`;
  elements.netTorque.innerText = `${stats.netTorque.toFixed(0)} Nm`;

  applyTilt(stats.angle);
}

function applyTilt(angle) {
  elements.plank.style.transform = `translateX(-50%) rotate(${angle}deg)`;
}

function getPlankSurfaceY(x, pivotX, pivotY, angle) {
  const radians = angle * (Math.PI / 180);
  return pivotY + (x - pivotX) * Math.tan(radians);
}

function landWeight(w) {
  elements.plank.appendChild(w.element);

  const newLeft = PLANK_LENGTH / 2 + w.distance - w.edge / 2;
  const newTop = -w.edge;

  w.element.style.left = `${newLeft}px`;
  w.element.style.top = `${newTop}px`;

  state.weights.push({
    element: w.element,
    weight: w.weight,
    distance: w.distance,
    side: w.side,
  });

  addLogEntry(w.weight, w.distance, w.side);
  renderStats();
  saveState();
}

// Settings

function handleReset(e) {
  state.weights = [];
  state.falling = [];
  document.querySelectorAll(".weight").forEach((w) => w.remove());
  clearLog();
  renderStats();
  saveState();
}

function handleUndo(e) {
  if (state.weights.length > 0) {
    const last = state.weights.pop();
    last.element.remove();

    const items = elements.dropLog.querySelectorAll(".log__item");
    if (items.length > 0) {
      items[0].remove();
    }

    if (items.length <= 1) {
      clearLog();
    }

    renderStats();
    saveState();
  }
}

function handlePause(e) {
  state.paused = !state.paused;
  elements.pauseBanner.classList.toggle("active", state.paused);
}

function setWeightMode(mode, regenerateNext = true) {
  state.weightMode = mode;

  elements.modeRandomBtn.classList.toggle("btn--active", mode === "random");
  elements.modeFixedBtn.classList.toggle("btn--active", mode === "fixed");
  elements.stepperWrapper.hidden = mode !== "fixed";

  if (regenerateNext) {
    state.nextWeight = computeNextWeight();
    renderNextWeight();
  }
  saveState();
}

function adjustFixedWeight(diff) {
  const newWeight = Math.max(1, Math.min(10, state.fixedWeight + diff));
  state.fixedWeight = newWeight;
  elements.fixedWeightValue.innerText = `${newWeight} kg`;

  state.nextWeight = computeNextWeight();
  renderNextWeight();
  saveState();
}

// Logging

function addLogEntry(weight, distance, side) {
  const empty = elements.dropLog.querySelector(".log__empty");
  if (empty) empty.remove();

  const li = document.createElement("li");
  li.classList.add("log__item", `log__item--${side}`);

  li.innerText = `📦 ${weight}kg => ${distance}px | ${side.toUpperCase()}`;

  elements.dropLog.prepend(li);
}

function clearLog() {
  elements.dropLog.innerHTML = `<li class="log__empty">No drops yet. Click on the plank to start.</li>`;
}

// Local Storage

function saveState() {
  const serializable = {
    weights: state.weights.map(({ weight, distance, side }) => ({
      weight,
      distance,
      side,
    })),
    weightMode: state.weightMode,
    fixedWeight: state.fixedWeight,
    nextWeight: state.nextWeight,
  };
  localStorage.setItem("seesaw-state", JSON.stringify(serializable));
}

function loadState() {
  const saved = localStorage.getItem("seesaw-state");

  try {
    const parsed = JSON.parse(saved);
    state.weightMode = parsed.weightMode ?? "random";
    state.fixedWeight = parsed.fixedWeight ?? 5;
    state.nextWeight = parsed.nextWeight ?? computeNextWeight();

    for (const { weight, distance, side } of parsed.weights ?? []) {
      spawnLandedWeight(weight, distance, side);
    }
  } catch (e) {
    console.warn("Failed to load saved state", e);
  }

  if (state.nextWeight === null) {
    state.nextWeight = computeNextWeight();
  }
}

function spawnLandedWeight(weight, distance, side) {
  const edge = 20 + weight * 4;
  const weightElement = document.createElement("div");
  weightElement.classList.add("weight");
  weightElement.innerText = `${weight}kg`;
  weightElement.style.width = `${edge}px`;
  weightElement.style.height = `${edge}px`;
  weightElement.style.backgroundColor = COLORS[weight - 1];
  weightElement.style.left = `${PLANK_LENGTH / 2 + distance - edge / 2}px`;
  weightElement.style.top = `${-edge}px`;
  elements.plank.appendChild(weightElement);

  state.weights.push({
    element: weightElement,
    weight,
    distance,
    side,
  });
}

// Physics Simulation

function animate() {
  if (!state.paused) {
    const plankRect = elements.plank.getBoundingClientRect();
    const pgRect = elements.playground.getBoundingClientRect();

    const pivotX = plankRect.left + plankRect.width / 2 - pgRect.left;
    const pivotY = plankRect.top + plankRect.height / 2 - pgRect.top;

    const { angle: currentAngle } = computeStats();

    for (let i = state.falling.length - 1; i >= 0; i--) {
      const w = state.falling[i];
      w.vy += GRAVITY;
      w.posY += w.vy;
      w.element.style.top = `${w.posY - w.edge / 2}px`;

      const surfaceY = getPlankSurfaceY(w.posX, pivotX, pivotY, currentAngle);

      if (w.posY + w.edge / 2 >= surfaceY) {
        landWeight(w);
        state.falling.splice(i, 1);
      }
    }
  }

  requestAnimationFrame(animate);
}

// Initial setup
loadState();
setWeightMode(state.weightMode, false);
renderNextWeight();
renderStats();
animate();
