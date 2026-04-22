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

// Referances
const playground = document.getElementById("playground");
const plank = document.getElementById("plank");

// Register Events
playground.addEventListener("click", handlePlankClick);

function handlePlankClick(e) {
  const pgRect = playground.getBoundingClientRect();
  const plankRect = plank.getBoundingClientRect();
  const plankCenter = plankRect.left + plankRect.width / 2;
  const distanceFromPivot = e.clientX - plankCenter;
  const absDistance = Math.abs(distanceFromPivot);
  const isOverPlank =
    absDistance <= plankRect.width / 2 && e.clientY < plankRect.top;
  const side = distanceFromPivot < 0 ? "left" : "right";
  const posX = e.clientX - pgRect.left;
  const posY = e.clientY - pgRect.top;
  const weight = Math.floor(Math.random() * 10) + 1;

  console.log({
    pointer: {
      x: distanceFromPivot,
      absDistance: absDistance,
      side: side,
      isOverPlank: isOverPlank,
    },
    spawn: {
      posX: posX,
      posY: posY,
      side: side,
      weight: weight,
    },
  });

  if (isOverPlank) {
    spawnWeight(posX, posY, weight);
  }
}

function spawnWeight(posX, posY, weight) {
  const edge = 20 + weight * 4;
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
}
