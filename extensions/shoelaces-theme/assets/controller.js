let currentIndex = 0;
let activeColorTarget = "model";

// =========================
// Apply material color helper
// =========================

function applyMaterialColor(material, color) {
  if (!material || !material.color) return;

  material.color.set(color);
  material.needsUpdate = true;
}

function getMeshBaseName(mesh) {
  return (mesh?.name || "").toLowerCase().replace(/\.\d+$/, "");
}

function getEditableShoelaceKey(mesh) {
  if (window.ShoelaceApp?.getEditableShoelaceKey) {
    return window.ShoelaceApp.getEditableShoelaceKey(mesh?.name);
  }

  return getMeshBaseName(mesh);
}

function isShoePreviewLaceMesh(mesh) {
  const rawName = String(mesh?.name || "").toLowerCase();

  return (
    rawName === "object_40.001" ||
    rawName === "object_40.002" ||
    rawName === "object_40001" ||
    rawName === "object_40002"
  );
}

window.applyShoePreviewLaceColor = function (shoe, color) {
  if (!shoe || !color) return;

  let didApplyColor = false;

  shoe.traverse((child) => {
    if (!child.isMesh || !isShoePreviewLaceMesh(child)) return;

    if (Array.isArray(child.material)) {
      child.material.forEach((mat) => applyMaterialColor(mat, color));
    } else {
      applyMaterialColor(child.material, color);
    }

    didApplyColor = true;
  });

  if (!didApplyColor) {
    console.warn(
      "No shoe preview lace meshes matched Object_40.001, Object_40.002, Object_40001, or Object_40002.",
    );
  }
};

// =========================
// Update model color
// =========================

function updateModelColorFromColor(color, colorName = "") {
  if (!color) return;

  ShoelaceApp.activeColor = colorName || color;
  ShoelaceApp.activeModelColorHex = color;

  ShoelaceApp.shoelaces.forEach((mesh) => {
    const name = getEditableShoelaceKey(mesh);

    // only editable shoelace meshes
    if (
      name !== "shoelace_1" &&
      name !== "shoelace_2" &&
      name !== "shoelace_3" &&
      name !== "shoelace_4"
    ) {
      return;
    }

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => applyMaterialColor(mat, color));
    } else {
      applyMaterialColor(mesh.material, color);
    }
  });

  window.applyShoePreviewLaceColor(ShoelaceApp.shoe, color);
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
  const previewTargetMeshes = ShoelaceApp.isBackView
    ? ShoelaceApp.backPreviewTextMeshes
    : ShoelaceApp.frontPreviewTextMeshes;

  [...(targetMeshes || []), ...(previewTargetMeshes || [])].forEach((item) => {
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
  const previewTargetMeshes = ShoelaceApp.isBackView
    ? ShoelaceApp.backPreviewTextMeshes
    : ShoelaceApp.frontPreviewTextMeshes;

  [...(targetMeshes || []), ...(previewTargetMeshes || [])].forEach((item) => {
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

function updateAgletColorFromColor(color, colorName = "") {
  if (!color || !window.ShoelaceApp?.applyAgletColor) return;

  ShoelaceApp.applyAgletColor(color, colorName);
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
    updateAgletColorFromColor(color, colorName);
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

  if (activeColorTarget === "aglets") {
    updateAgletColorFromColor(color, colorName);
  }
}

// =========================
// UI buttons
// =========================

const colorTargetButtons = document.querySelectorAll(".color-target-btn");
const buttons = document.querySelectorAll(".color-btn");
const fontButtons = document.querySelectorAll(".font-btn");

document.addEventListener("DOMContentLoaded", function () {
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]',
  );
  tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
});

// target buttons: All / Laces / Text / Emoji / Aglets
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

window.showCartStatus = function (title, message, autoClose = true) {
  const overlay = document.getElementById("addToCartStatus");
  const titleEl = document.getElementById("cartStatusTitle");
  const messageEl = document.getElementById("cartStatusMessage");

  if (!overlay || !titleEl || !messageEl) return;

  titleEl.innerText = title;
  messageEl.innerText = message;

  overlay.classList.add("show");

  if (autoClose) {
    setTimeout(() => {
      overlay.classList.remove("show");
    }, 3000);
  }
};

window.hideCartStatus = function () {
  const overlay = document.getElementById("addToCartStatus");

  if (!overlay) return;

  overlay.classList.remove("show");
};
