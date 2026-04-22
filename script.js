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
};

// Referances
const elements = {
  playground: document.getElementById("playground"),
  plank: document.getElementById("plank"),
  leftWeight: document.getElementById("left-weight"),
  rightWeight: document.getElementById("right-weight"),
  tiltAngle: document.getElementById("tilt-angle"),
  netTorque: document.getElementById("net-torque"),
  leftCount: document.getElementById("left-count"),
  rightCount: document.getElementById("right-count"),
};

// Register Events
playground.addEventListener("click", handlePlankClick);

function handlePlankClick(e) {
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
  const weight = Math.floor(Math.random() * 10) + 1;

  if (isOverPlank) {
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
    edge,
    weight,
    distance,
    side,
  });
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
  playground.appendChild(weightElement);
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
  elements.tiltAngle.innerText = `${stats.angle}°`;
  elements.netTorque.innerText = `${stats.netTorque} Nm`;

  applyTilt(stats.angle);
}

function applyTilt(angle) {
  elements.plank.style.transform = `translateX(-50%) rotate(${angle}deg)`;
}

function animate() {
  const plankRect = elements.plank.getBoundingClientRect();
  const pgRect = elements.playground.getBoundingClientRect();
  const plankTopY = plankRect.top - pgRect.top;

  for (let i = state.falling.length - 1; i >= 0; i--) {
    const w = state.falling[i];
    w.vy = (w.vy ?? 0) + GRAVITY;
    w.posY += w.vy;
    w.element.style.top = `${w.posY - w.edge / 2}px`;

    if (w.posY + w.edge / 2 >= plankTopY) {
      w.posY = plankTopY - w.edge / 2;
      w.element.style.top = `${w.posY - w.edge / 2}px`;
      state.falling.splice(i, 1);
      state.weights.push({
        weight: w.weight,
        distance: w.distance,
        side: w.side,
      });
      renderStats();
    }
  }
  requestAnimationFrame(animate);
}
animate();
