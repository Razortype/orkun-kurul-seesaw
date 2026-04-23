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

// References
const elements = {
  playground: document.getElementById("playground"),
  hoverPreview: document.getElementById("hover-preview"),
  nextWeightBox: document.getElementById("next-weight-box"),
  plank: document.getElementById("plank"),
  groundShadow: document.getElementById("ground-shadow"),
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
elements.playground.addEventListener("mousemove", handlePlaygroundMove);
elements.playground.addEventListener("mouseleave", handlePlaygroundLeave);
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

  const info = getPointInfo(e.clientX, e.clientY);
  if (!info.isOverPlank) return;

  const weight = getNextWeight();
  dropWeight(info.posX, info.posY, info.distanceFromPivot, weight, info.side);
  elements.hoverPreview.hidden = true;
}

function getPlankProjection() {
  const pgRect = elements.playground.getBoundingClientRect();
  const plankRect = elements.plank.getBoundingClientRect();

  const pivotX = plankRect.left + plankRect.width / 2;
  const pivotY = plankRect.top + plankRect.height / 2;

  const { angle } = computeStats();
  const radians = angle * (Math.PI / 180);
  const projectedHalfWidth = (PLANK_LENGTH / 2) * Math.abs(Math.cos(radians));

  return {
    pivotX,
    pivotY,
    projectedHalfWidth,
    pivotXRelative: pivotX - pgRect.left,
    pivotYRelative: pivotY - pgRect.top,
    pgRect,
    plankRect,
    angle,
  };
}

function getPointInfo(clientX, clientY) {
  const proj = getPlankProjection();

  const distanceFromPivot = clientX - proj.pivotX;
  const absDistance = Math.abs(distanceFromPivot);
  const side = distanceFromPivot < 0 ? "left" : "right";

  const isOverPlank =
    absDistance <= proj.projectedHalfWidth && clientY < proj.pivotY;

  const posX = clientX - proj.pgRect.left;
  const posY = clientY - proj.pgRect.top;

  return {
    distanceFromPivot,
    absDistance,
    side,
    isOverPlank,
    posX,
    posY,
    projection: proj,
  };
}

function dropWeight(posX, posY, distance, weight, side) {
  const { element, edge } = spawnWeight(posX, posY, weight);
  state.falling.push({
    element,
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

function createWeightElement(weight) {
  const edge = 20 + weight * 4;
  const el = document.createElement("div");
  el.classList.add("weight");
  el.innerText = `${weight}kg`;
  el.style.width = `${edge}px`;
  el.style.height = `${edge}px`;
  el.style.backgroundColor = COLORS[weight - 1];
  return { element: el, edge };
}

function spawnWeight(posX, posY, weight) {
  const { element, edge } = createWeightElement(weight);
  element.style.left = `${posX - edge / 2}px`;
  element.style.top = `${posY - edge / 2}px`;
  elements.playground.appendChild(element);
  return { element, edge };
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
  renderGroundShadow();
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

function handleUndo() {
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

function handlePause() {
  state.paused = !state.paused;
  renderPause();
}

function setWeightMode(mode, regenerateNext = true) {
  state.weightMode = mode;
  renderWeightMode();

  if (regenerateNext) {
    state.nextWeight = computeNextWeight();
    renderNextWeight();
  }
  saveState();
}

function renderWeightMode() {
  elements.modeRandomBtn.classList.toggle(
    "btn--active",
    state.weightMode === "random",
  );
  elements.modeFixedBtn.classList.toggle(
    "btn--active",
    state.weightMode === "fixed",
  );
  elements.stepperWrapper.hidden = state.weightMode !== "fixed";
}

function adjustFixedWeight(diff) {
  if (state.weightMode !== "fixed") return;
  state.fixedWeight = Math.max(1, Math.min(10, state.fixedWeight + diff));
  renderFixedWeight();
  state.nextWeight = computeNextWeight();
  renderNextWeight();
  saveState();
}

function renderFixedWeight() {
  elements.fixedWeightValue.innerText = `${state.fixedWeight} kg`;
}

function renderPause() {
  elements.pauseBanner.classList.toggle("active", state.paused);
}

function renderGroundShadow() {
  const proj = getPlankProjection();
  elements.groundShadow.style.width = `${proj.projectedHalfWidth * 2}px`;
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

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      if (parsed && typeof parsed === "object") {
        state.weightMode = parsed.weightMode ?? "random";
        state.fixedWeight = parsed.fixedWeight ?? 5;
        state.nextWeight = parsed.nextWeight ?? null;

        for (const { weight, distance, side } of parsed.weights ?? []) {
          spawnLandedWeight(weight, distance, side);
        }
      }
    } catch (e) {
      console.warn("Failed to load saved state", e);
    }
  }

  if (state.nextWeight === null) {
    state.nextWeight = computeNextWeight();
    return;
  }
}

function spawnLandedWeight(weight, distance, side) {
  const { element, edge } = createWeightElement(weight);
  element.style.left = `${PLANK_LENGTH / 2 + distance - edge / 2}px`;
  element.style.top = `${-edge}px`;
  elements.plank.appendChild(element);

  state.weights.push({ element, weight, distance, side });
}

function renderAll() {
  renderWeightMode();
  renderFixedWeight();
  renderPause();
  renderNextWeight();
  renderStats();
  renderGroundShadow();
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

function handlePlaygroundMove(e) {
  if (state.paused) {
    elements.hoverPreview.hidden = true;
    return;
  }

  const info = getPointInfo(e.clientX, e.clientY);
  if (!info.isOverPlank) {
    elements.hoverPreview.hidden = true;
    return;
  }

  const edge = 20 + state.nextWeight * 4;
  elements.hoverPreview.hidden = false;
  elements.hoverPreview.style.width = `${edge}px`;
  elements.hoverPreview.style.height = `${edge}px`;
  elements.hoverPreview.style.left = `${info.posX - edge / 2}px`;
  elements.hoverPreview.style.top = `${info.posY - edge / 2}px`;
}

function handlePlaygroundLeave() {
  elements.hoverPreview.hidden = true;
}

// Initial setup
loadState();
renderAll();
animate();
