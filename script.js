const playground = document.getElementById("playground");
const plank = document.getElementById("plank");

function handlePlankClick(e) {
  const plankRect = plank.getBoundingClientRect();
  const plankCenter = plankRect.left + plankRect.width / 2;
  const distanceFromPivot = e.clientX - plankCenter;
  const absDistance = Math.abs(distanceFromPivot);
  const isOverPlank = absDistance <= plankRect.width / 2;
  const side = distanceFromPivot < 0 ? "left" : "right";

  console.log({
    x: distanceFromPivot,
    absDistance: absDistance,
    side: side,
    isOverPlank: isOverPlank,
  });
}

playground.addEventListener("click", handlePlankClick);
