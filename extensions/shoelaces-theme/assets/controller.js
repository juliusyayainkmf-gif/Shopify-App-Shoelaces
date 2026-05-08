let currentIndex = 0;
let activeColorTarget = "all";

// =========================
// Apply material color helper
// =========================

function applyMaterialColor(material, color) {
  if (!material || !material.color) return;

  material.color.set(color);
  material.needsUpdate = true;
}

// =========================
// Update model color
// =========================

function updateModelColorFromColor(color, colorName = "") {
  if (!color) return;

  ShoelaceApp.activeColor = colorName || color;

  ShoelaceApp.shoelaces.forEach((mesh) => {
    const name = mesh.name.toLowerCase();

    // only shoelace_1 and shoelace_2
    if (name !== "shoelace_1" && name !== "shoelace_2") return;

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => applyMaterialColor(mat, color));
    } else {
      applyMaterialColor(mesh.material, color);
    }
  });
}

// =========================
// Update text color
// =========================

function updateTextColorFromColor(color, colorName = "") {
  if (!color) return;

  if (ShoelaceApp.isBackView) {
    ShoelaceApp.backTextColor = color;
    ShoelaceApp.backTextColorName = colorName || color;
  } else {
    ShoelaceApp.frontTextColor = color;
    ShoelaceApp.frontTextColorName = colorName || color;
  }

  const targetMeshes = ShoelaceApp.isBackView
    ? ShoelaceApp.backTextMeshes
    : ShoelaceApp.frontTextMeshes;

  if (!targetMeshes) return;

  targetMeshes.forEach((item) => {
    item.traverse((child) => {
      if (
        child.isMesh &&
        child.material &&
        child.material.color &&
        child.userData.type === "text"
      ) {
        applyMaterialColor(child.material, color);
      }
    });
  });
}

function updateEmojiColorFromColor(color, colorName = "") {
  if (!color) return;

  if (ShoelaceApp.isBackView) {
    ShoelaceApp.backEmojiColor = color;
    ShoelaceApp.backEmojiColorName = colorName || color;
  } else {
    ShoelaceApp.frontEmojiColor = color;
    ShoelaceApp.frontEmojiColorName = colorName || color;
  }

  const targetMeshes = ShoelaceApp.isBackView
    ? ShoelaceApp.backTextMeshes
    : ShoelaceApp.frontTextMeshes;

  if (!targetMeshes) return;

  targetMeshes.forEach((item) => {
    item.traverse((child) => {
      if (
        child.isMesh &&
        child.material &&
        child.material.color &&
        child.userData.type === "emoji"
      ) {
        applyMaterialColor(child.material, color);
      }
    });
  });
}

// =========================
// Change color depending on selected target
// =========================

function updateColorByTarget(button) {
  if (!button) return;

  const color = button.dataset.color;
  const colorName = button.dataset.title || button.title || color;

  if (!color) return;

  if (activeColorTarget === "all") {
    updateModelColorFromColor(color, colorName);
    updateTextColorFromColor(color, colorName);
    updateEmojiColorFromColor(color, colorName);
  }

  if (activeColorTarget === "model") {
    updateModelColorFromColor(color, colorName);
  }

  if (activeColorTarget === "text") {
    updateTextColorFromColor(color, colorName);
  }

  if (activeColorTarget === "emoji") {
    updateEmojiColorFromColor(color, colorName);
  }
}

// =========================
// UI buttons
// =========================

const colorTargetButtons = document.querySelectorAll(".color-target-btn");
const buttons = document.querySelectorAll(".color-btn");
const fontButtons = document.querySelectorAll(".font-btn");

document.addEventListener("DOMContentLoaded", function () {
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
});

// target buttons: All / Laces / Text / Emoji
colorTargetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    activeColorTarget = btn.dataset.target || "all";

    colorTargetButtons.forEach((item) => {
      item.classList.remove("btn-dark", "btn-active", "active");
      item.classList.add("btn-outline-dark");
    });

    btn.classList.remove("btn-outline-dark");
    btn.classList.add("btn-dark", "btn-active", "active");
  });
});

// color palette buttons
buttons.forEach((btn, i) => {
  btn.addEventListener("click", () => {
    currentIndex = i;
    updateColorByTarget(btn);
  });
});

// =========================
// Cart status
// =========================

function showCartStatus(title, message) {
  const overlay = document.getElementById("addToCartStatus");

  document.getElementById("cartStatusTitle").innerText = title;
  document.getElementById("cartStatusMessage").innerText = message;

  overlay.classList.add("show");

  setTimeout(() => {
    overlay.classList.remove("show");
  }, 3000);
}