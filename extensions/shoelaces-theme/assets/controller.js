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

    if (window.ShoelaceApp?.prepareShoelaceSwatchMaterial) {
      ShoelaceApp.prepareShoelaceSwatchMaterial(child);
    }

    if (Array.isArray(child.material)) {
      child.material.forEach((mat) => applyMaterialColor(mat, color));
    } else {
      applyMaterialColor(child.material, color);
    }

    didApplyColor = true;
  });

};

// =========================
// Update model color
// =========================

function updateModelColorFromColor(color, colorName = "") {
  if (!color) return;

  ShoelaceApp.activeColor = colorName || color;
  ShoelaceApp.activeModelColorHex = color;

  const laceMeshes = ShoelaceApp.getEditableShoelaceColorMeshes
    ? ShoelaceApp.getEditableShoelaceColorMeshes()
    : ShoelaceApp.shoelaces.filter((mesh) => {
        const name = getEditableShoelaceKey(mesh);

        return (
          name === "shoelace_1" ||
          name === "shoelace_2" ||
          name === "shoelace_3" ||
          name === "shoelace_4"
        );
      });

  laceMeshes.forEach((mesh) => {
    if (ShoelaceApp.prepareShoelaceSwatchMaterial) {
      ShoelaceApp.prepareShoelaceSwatchMaterial(mesh);
    }

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => applyMaterialColor(mat, color));
    } else {
      applyMaterialColor(mesh.material, color);
    }
  });

  window.applyShoePreviewLaceColor(ShoelaceApp.shoe, color);

  if (ShoelaceApp.syncAgletColors) {
    ShoelaceApp.syncAgletColors();
  }
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

function initHelpModal() {
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]',
  );
  tooltipTriggerList.forEach((el) => {
    if (window.bootstrap?.Tooltip) {
      new bootstrap.Tooltip(el);
    }
  });

  const helpBtn = document.getElementById("helpBtn");
  const helpModal = document.getElementById("helpModal");
  const closeHelpBtn = document.getElementById("closeHelpModal");
  const helpOverlay = document.querySelector(".help-modal-overlay");
  const iconMenuBtn = document.getElementById("iconMenuBtn");
  const iconContainer = document.querySelector(".icon-container");

  const openHelpModal = () => {
    helpModal?.classList.add("active");
    iconContainer?.classList.remove("menu-open");
    iconMenuBtn?.setAttribute("aria-expanded", "false");
  };

  const closeHelpModal = () => {
    helpModal?.classList.remove("active");
  };

  helpBtn?.addEventListener("click", openHelpModal);
  closeHelpBtn?.addEventListener("click", closeHelpModal);
  helpOverlay?.addEventListener("click", closeHelpModal);
  iconMenuBtn?.addEventListener("click", () => {
    const isOpen = iconContainer?.classList.toggle("menu-open") || false;
    iconMenuBtn.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeHelpModal();
      iconContainer?.classList.remove("menu-open");
      iconMenuBtn?.setAttribute("aria-expanded", "false");
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHelpModal);
} else {
  initHelpModal();
}

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
