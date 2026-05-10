const config = JSON.parse(
  document.getElementById("configurator-data").textContent,
);

const VARIANT_ID_WITH_CUSTOMIZATION =
  window.SHOELACE_CONFIG && window.SHOELACE_CONFIG.variantId
    ? Number(window.SHOELACE_CONFIG.variantId)
    : null;

console.log(VARIANT_ID_WITH_CUSTOMIZATION);

window.ShoelaceApp = {
  canvas: null,
  scene: null,
  camera: null,
  renderer: null,
  raycaster: null,
  mouse: null,
  controls: null,
  controls2: null,
  loader: null,

  model: null,
  shoe: null,
  shoelaces: [],

  mouseDown: false,
  startX: 0,
  startY: 0,
  clickThreshold: 5,

  viewport_width: 0,
  viewport_height: 1,

  targetPosition: new THREE.Vector3(),
  isMoving: false,
  isBackView: false,
  isCameraAnimating: false,

  cameraStates: {},

  textTargetLaces: [],
  frontTextValue: "",
  backTextValue: "",
  frontTextMeshes: [],
  backTextMeshes: [],
  textMaterial: null,
  textColor: "#111111",
  emojiColor: "#111111",
  textFieldMaxWidth: 2.9,

  frontTextColor: "#111111",
  backTextColor: "#111111",
  frontEmojiColor: "#111111",
  backEmojiColor: "#111111",
  fontLoader: null,
  font: null,
  iconRegistry: {},
  iconTemplates: {},
  activeTextSide: "front",

  frontTextColorName: "Black",
  backTextColorName: "Black",
  frontEmojiColorName: "Black",
  backEmojiColorName: "Black",

  pdfFrontCamera: null,
  pdfBackCamera: null,

  models: {
    shoelace: config.models.small,
    shoe: config.models.shoe,
  },

  modelLoading: {
    total: 0,
    loaded: 0,
  },

  showLoader() {
    const loader = document.getElementById("loader");

    if (!loader) return;

    loader.style.display = "flex";
    loader.classList.remove("hiddens");
  },

  hideLoader() {
    const loader = document.getElementById("loader");

    if (!loader) return;

    loader.classList.add("hiddens");

    setTimeout(() => {
      loader.style.display = "none";
    }, 400);
  },

  markModelLoaded(key) {
    this.modelLoading.loaded += 1;

    console.log(
      `Model loaded ${this.modelLoading.loaded}/${this.modelLoading.total}:`,
      key,
    );

    if (this.modelLoading.loaded >= this.modelLoading.total) {
      this.hideLoader();
    }
  },

  init() {
    // 1. Get the config safely
    const configElement = document.getElementById("configurator-data");

    if (!configElement) {
      console.error(
        "Critical Error: #configurator-data element not found in DOM.",
      );
      return;
    }

    try {
      this.config = JSON.parse(configElement.textContent);
    } catch (e) {
      console.error("Critical Error: Could not parse configurator JSON.", e);
      return;
    }

    // 2. Set the model paths from the config
    this.models = {
      shoelace: this.config.models.small,
      shoe: this.config.models.shoe,
    };

    this.loader = new window.GLTFLoader();
    this.setupScene();
    this.setupLights();
    this.setupFloor();
    ShoelaceText.loadTextFont(this);
    this.loadModel();
    this.setupEvents();
    this.setupIconsFromButtons();
    this.setupUI();
    this.updateTextInputAvailability();
    this.preloadIcons();
    this.animate();
  },

  loadingScreen() {
    const loaderEl = document.getElementById("loader");

    this.loadingManager = new THREE.LoadingManager();

    this.loadingManager.onStart = () => {
      if (loaderEl) {
        loaderEl.style.display = "flex";
        loaderEl.classList.remove("hiddens");
      }
    };

    this.loadingManager.onLoad = () => {
      if (!loaderEl) return;

      loaderEl.classList.add("hiddens");

      setTimeout(() => {
        loaderEl.style.display = "none";
      }, 400);
    };

    this.loadingManager.onError = (url) => {
      console.error("Error loading:", url);
    };

    this.loader = new window.GLTFLoader(this.loadingManager);
    this.fontLoader = new window.FontLoader(this.loadingManager);
  },

  setupScene() {
    this.canvas = document.getElementById("dubrae-config");

    const v_width = window.innerWidth < 992 ? 0 : 500;
    const v_height = window.innerWidth < 992 ? 2 : 1;

    const width = window.innerWidth - v_width;
    const height = window.innerHeight / v_height;

    const btn = document.querySelector(".icon-container");
    if (btn) {
      btn.style.right = v_width + 20 + "px";
      btn.style.opacity = 1;
    }

    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 10);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.physicallyCorrectLights = true;

    // const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    // this.scene.add(ambient);

    // const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    // dirLight.position.set(3, 5, 4);
    // this.scene.add(dirLight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enableZoom = false;
    this.controls.enablePan = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0, 0);

    this.controls2 = new TrackballControls(
      this.camera,
      this.renderer.domElement,
    );
    this.controls2.noRotate = true;
    this.controls2.noPan = true;
    this.controls2.noZoom = false;
    this.controls2.zoomSpeed = 0.3;

    this.saveCameraState("default");
  },

  setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 10);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(0, 10, 5);
    dirLight.castShadow = true;

    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.bias = -0.0002;
    dirLight.shadow.normalBias = 0.02;
    dirLight.shadow.radius = 4;

    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.updateProjectionMatrix();

    this.scene.add(dirLight);
  },

  setupFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000),
      new THREE.ShadowMaterial({
        color: 0x000000,
        opacity: 0.35,
      }),
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0; // lower this until shadow appears under laces
    floor.receiveShadow = true;

    this.scene.add(floor);
  },

  setupPDFCameras(center) {
    const aspect = 1;
    const fov = 50;
    const near = 0.1;
    const far = 1000;

    this.pdfFrontCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.pdfBackCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    // Keep the live/front configurator view exactly the same.
    this.pdfFrontCamera.position.set(center.x, center.y, center.z + 9);
    this.pdfFrontCamera.lookAt(center);
    this.pdfFrontCamera.updateProjectionMatrix();

    // Back PDF camera.
    // Start with Z- because this matches your current back state.
    // If it still shows the side, change this to X+ below.
    this.pdfBackCamera.position.set(center.x, center.y, center.z - 9);
    this.pdfBackCamera.lookAt(center);
    this.pdfBackCamera.updateProjectionMatrix();

    this.pdfCameraTarget = center.clone();
  },

  saveCameraState(name) {
    this.cameraStates[name] = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
  },

  unlockCameraDragLimits() {
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;

    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;

    this.controls.update();
  },

  setCameraDragLimits(view) {
    const limit = THREE.MathUtils.degToRad(90); // user can drag 90deg left/right

    if (view === "front") {
      // FRONT ONLY
      this.controls.minAzimuthAngle = -limit;
      this.controls.maxAzimuthAngle = limit;
    }

    if (view === "back") {
      // BACK ONLY
      this.controls.minAzimuthAngle = Math.PI - limit;
      this.controls.maxAzimuthAngle = Math.PI + limit;
    }

    // Optional vertical limits so user cannot flip above/below too much
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(45);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(135);

    this.controls.update();
  },

  toggleBackCameraView() {
    if (!this.model) return;

    if (this.isCameraAnimating) return;

    this.isCameraAnimating = true;
    this.isBackView = !this.isBackView;

    this.unlockCameraDragLimits();

    if (this.isBackView) {
      this.goToCameraState("back", () => {
        this.setCameraDragLimits("back");
        this.updateTextInputAvailability();
        this.isCameraAnimating = false;
      });
    } else {
      this.goToCameraState("default", () => {
        this.setCameraDragLimits("front");
        this.updateTextInputAvailability();
        this.isCameraAnimating = false;
      });
    }
  },

  goToCameraState(name, onComplete = null) {
    const state = this.cameraStates[name];
    if (!state) return;

    // Stop any old camera animations
    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.controls.target);

    let completedTweens = 0;

    const finish = () => {
      completedTweens++;

      if (completedTweens === 2 && typeof onComplete === "function") {
        onComplete();
      }
    };

    gsap.to(this.camera.position, {
      x: state.position.x,
      y: state.position.y,
      z: state.position.z,
      duration: 1,
      ease: "power2.out",
      onUpdate: () => {
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      },
      onComplete: finish,
    });

    gsap.to(this.controls.target, {
      x: state.target.x,
      y: state.target.y,
      z: state.target.z,
      duration: 1,
      ease: "power2.out",
      onUpdate: () => {
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      },
      onComplete: finish,
    });
  },

  loadModel() {
    this.shoelaces = [];

    const modelEntries = Object.entries(this.models || {}).filter(
      ([key, modelPath]) => Boolean(modelPath),
    );

    this.modelLoading.total = modelEntries.length;
    this.modelLoading.loaded = 0;
    this.showLoader();

    if (!modelEntries.length) {
      this.hideLoader();
      return;
    }

    const isShoelaceFabric = (name) => {
      return name === "Plane.001" || name === "Plane.002";
    };

    const prepareMaterial = (material, isLace) => {
      if (!material) return material;

      const mat = material.clone();

      mat.needsUpdate = true;
      return mat;
    };

    modelEntries.forEach(([key, modelPath]) => {
      console.log("Loading model:", key, modelPath);

      this.loader.load(
        modelPath,
        (gltf) => {
          console.log("Loaded model:", key, gltf);

          const model = gltf.scene;

          model.traverse((child) => {
            if (!child.isMesh) return;

            const isLace = child.name.toLowerCase().includes("shoelace");

            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];

            materials.forEach((mat) => {
              if (!mat) return;

              mat.side = THREE.DoubleSide;

              if (isShoelaceFabric(mat.name)) {
                mat.color.set(0xf0f0f0);
              }

              if (mat.normalMap) {
                mat.normalScale.set(0.5, 0.5);
              }

              mat.needsUpdate = true;
            });

            if (isLace) {
              this.shoelaces.push(child);

              const name = child.name.toLowerCase();

              if (name === "shoelace_1" || name === "shoelace_2") {
                this.textTargetLaces.push(child);
              }
            }

            child.castShadow = true;
            child.receiveShadow = true;
          });

          this.scene.add(model);

          if (key === "shoelace") {
            this.model = model;

            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());

            this.setupPDFCameras(center);

            this.controls.target.copy(center);

            // FRONT / DEFAULT VIEW
            this.camera.position.set(center.x, center.y, center.z + 9);
            this.camera.lookAt(center);
            this.controls.update();

            this.cameraStates.default = {
              position: this.camera.position.clone(),
              target: center.clone(),
            };

            // BACK VIEW
            this.cameraStates.back = {
              position: new THREE.Vector3(center.x, center.y, center.z - 9),
              target: center.clone(),
            };

            // Start locked to front side only
            this.setCameraDragLimits("front");

            ShoelaceText.updateShoelaceText(
              this,
              this.frontTextValue || "",
              "front",
            );
            ShoelaceText.updateShoelaceText(
              this,
              this.backTextValue || "",
              "back",
            );
          }

          if (key === "shoe") {
            model.position.set(50, 0, 0);
            model.rotation.y = 7.5;
            this.shoe = model;
            this.shoe.visible = false;
          }

          this.markModelLoaded(key);
        },
        undefined,
        (error) => {
          console.error("Failed to load model:", key, modelPath, error);
          this.markModelLoaded(`${key} failed`);
        },
      );
    });
  },

  setupIconsFromButtons() {
    const buttons = document.querySelectorAll(".emoji-btn");

    buttons.forEach((btn) => {
      const name = btn.dataset.icon;
      const marker = btn.dataset.marker;
      const svg = btn.dataset.svg;

      if (!name || !marker || !svg) return;

      this.iconRegistry[name] = {
        name,
        marker,
        svg,
        scale: Number(btn.dataset.scale || 0.006),
        width: Number(btn.dataset.width || 0.3),
        x: Number(btn.dataset.x || 0),
        y: Number(btn.dataset.y || 0.1),
        z: Number(btn.dataset.z || 0),
        rotationX: Number(btn.dataset.rotationX || 0),
        rotationY: Number(btn.dataset.rotationY || 0),
        rotationZ: Number(btn.dataset.rotationZ || Math.PI),
      };
    });
  },

  async preloadIcons() {
    for (const icon of Object.values(this.iconRegistry)) {
      try {
        this.iconTemplates[icon.name] = await this.createSVGMesh(icon.svg);
      } catch (error) {
        console.error("Failed to preload icon:", icon.name, error);
      }
    }
  },

  async createIconMesh(name) {
    const icon = this.iconRegistry[name];

    if (!icon) return null;

    if (!this.iconTemplates[name]) {
      this.iconTemplates[name] = await this.createSVGMesh(icon.svg);
    }

    return this.iconTemplates[name].clone(true);
  },

  createSVGMesh(url) {
    return new Promise((resolve) => {
      const loader = new window.SVGLoader();

      loader.load(url, (data) => {
        const rawGroup = new THREE.Group();

        data.paths.forEach((path) => {
          const shapes = window.SVGLoaderCreateShapes(path);

          shapes.forEach((shape) => {
            const geometry = new THREE.ExtrudeGeometry(shape, {
              depth: 1,
              bevelEnabled: false,
            });

            const material = new THREE.MeshStandardMaterial({
              color: this.textColor || 0x111111,
              roughness: 0.5,
              metalness: 0.1,
            });

            const mesh = new THREE.Mesh(geometry, material);
            rawGroup.add(mesh);
          });
        });

        const box = new THREE.Box3().setFromObject(rawGroup);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();

        box.getCenter(center);
        box.getSize(size);

        const maxSize = Math.max(size.x, size.y);
        const SVG_BASE_SIZE = 40;

        if (maxSize > 0) {
          rawGroup.scale.setScalar(SVG_BASE_SIZE / maxSize);
        }

        // IMPORTANT: center AFTER scaling
        const scaledBox = new THREE.Box3().setFromObject(rawGroup);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);

        rawGroup.position.x -= scaledCenter.x;
        rawGroup.position.y -= scaledCenter.y;
        rawGroup.position.z -= scaledCenter.z;

        const finalGroup = new THREE.Group();
        finalGroup.add(rawGroup);

        resolve(finalGroup);
      });
    });
  },

  updateShoelaceCanvasText(text) {
    this.textMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (mesh.material.map) mesh.material.map.dispose();
        mesh.material.dispose();
      }
    });

    this.textMeshes = [];

    if (!text.trim()) return;

    for (const lace of this.textTargetLaces) {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 256;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font =
        "120px Arial, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#111111";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false,
      });

      const geometry = new THREE.PlaneGeometry(1.6, 0.4);
      const mesh = new THREE.Mesh(geometry, material);

      this.textMeshes.push(mesh);
      this.shrinkwrapTextToLace(mesh, lace);
    }
  },

  isEmoji(char) {
    return /[\u{1F300}-\u{1FAFF}]|[♥★▲☺]/u.test(char);
  },

  createEmojiMesh(emoji) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = "180px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#111111";

    ctx.fillText(emoji, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });

    const geometry = new THREE.PlaneGeometry(0.22, 0.22);
    return new THREE.Mesh(geometry, material);
  },

  setupEvents() {
    this.renderer.domElement.addEventListener("mousedown", (event) => {
      this.mouseDown = true;
      this.startX = event.clientX;
      this.startY = event.clientY;
    });

    this.renderer.domElement.addEventListener("mouseup", (event) => {
      if (!this.mouseDown) return;

      this.mouseDown = false;

      const deltaX = Math.abs(event.clientX - this.startX);
      const deltaY = Math.abs(event.clientY - this.startY);

      if (deltaX < this.clickThreshold && deltaY < this.clickThreshold) {
        this.onClick(event);
      }
    });

    window.addEventListener("resize", () => this.onResize());
  },

  captureImage(view = "front") {
    const width = 1000;
    const height = 1000;

    const originalSize = new THREE.Vector2();
    this.renderer.getSize(originalSize);

    const originalPixelRatio = this.renderer.getPixelRatio();

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);

    const pdfCamera =
      view === "back" ? this.pdfBackCamera : this.pdfFrontCamera;

    if (!pdfCamera) {
      console.error("PDF camera not ready:", view);
      this.renderer.setPixelRatio(originalPixelRatio);
      this.renderer.setSize(originalSize.x, originalSize.y, false);
      return this.renderer.domElement.toDataURL("image/png");
    }

    pdfCamera.aspect = width / height;
    pdfCamera.updateProjectionMatrix();

    this.scene.updateMatrixWorld(true);
    this.renderer.render(this.scene, pdfCamera);

    const image = this.renderer.domElement.toDataURL("image/png");

    this.renderer.setPixelRatio(originalPixelRatio);
    this.renderer.setSize(originalSize.x, originalSize.y, false);

    return image;
  },

  async generatePDF() {
    const frontImageData = this.captureImage("front");
    const backImageData = this.captureImage("back");

    const { PDFDocument, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    const page = pdfDoc.addPage([600, 800]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 750;

    page.drawText("SHOELACES", {
      x: 50,
      y,
      size: 18,
      font: bold,
    });

    page.drawText(new Date().toLocaleDateString(), {
      x: 450,
      y,
      size: 10,
      font,
    });

    y -= 30;

    page.drawText("PRODUCT CONFIGURATION SUMMARY", {
      x: 50,
      y,
      size: 13,
      font: bold,
    });

    y -= 10;

    page.drawLine({
      start: { x: 50, y },
      end: { x: 550, y },
      thickness: 1,
    });

    y -= 20;

    const frontPngImage = await pdfDoc.embedPng(frontImageData);
    const backPngImage = await pdfDoc.embedPng(backImageData);

    const frontScaled = frontPngImage.scale(0.23);
    const backScaled = backPngImage.scale(0.23);

    page.drawText("Front View", {
      x: 120,
      y,
      size: 11,
      font: bold,
    });

    page.drawText("Back View", {
      x: 380,
      y,
      size: 11,
      font: bold,
    });

    y -= 10;

    page.drawImage(frontPngImage, {
      x: 60,
      y: y - frontScaled.height,
      width: frontScaled.width,
      height: frontScaled.height,
    });

    page.drawImage(backPngImage, {
      x: 320,
      y: y - backScaled.height,
      width: backScaled.width,
      height: backScaled.height,
    });

    y = y - Math.max(frontScaled.height, backScaled.height) - 20;

    page.drawLine({
      start: { x: 50, y },
      end: { x: 550, y },
      thickness: 1,
    });

    y -= 20;

    page.drawText("CONFIGURATION DETAILS", {
      x: 50,
      y,
      size: 12,
      font: bold,
    });

    y -= 20;

    const labelX = 50;
    const valueX = 220;

    const data = [
      ["Model", "Flat Shoelaces"],
      ["Main Color", this.activeColor || "N/a"],

      ["Front Text", this.frontTextValue || "N/a"],
      ["Front Text Color", this.getTextColorSummary("front")],
      ["Front Emoji Color", this.getEmojiColorSummary("front")],

      ["Back Text", this.backTextValue || "N/a"],
      ["Back Text Color", this.getTextColorSummary("back")],
      ["Back Emoji Color", this.getEmojiColorSummary("back")],
    ];

    data.forEach(([label, value]) => {
      page.drawText(this.pdfSafeText(label), {
        x: labelX,
        y,
        size: 11,
        font: bold,
      });

      page.drawText(this.pdfSafeText(value), {
        x: valueX,
        y,
        size: 11,
        font,
      });

      y -= 18;
    });

    y -= 10;

    page.drawLine({
      start: { x: 50, y },
      end: { x: 550, y },
      thickness: 1,
    });

    y -= 20;

    page.drawText("NOTES / TERMS", {
      x: 50,
      y,
      size: 12,
      font: bold,
    });

    y -= 20;

    page.drawText(
      "- This document confirms the selected shoelace configuration.",
      {
        x: 50,
        y,
        size: 10,
        font,
      },
    );

    y -= 15;

    page.drawText("- Final product may vary slightly from preview.", {
      x: 50,
      y,
      size: 10,
      font,
    });

    const pdfBytes = await pdfDoc.save();

    return pdfBytes;
  },

  pdfSafeText(value) {
    if (!value) return "N/a";

    let text = String(value);

    if (this.iconRegistry) {
      Object.values(this.iconRegistry).forEach((icon) => {
        if (icon.marker && icon.name) {
          text = text.replaceAll(icon.marker, icon.name);
        }
      });
    }

    return text.replace(/[^\x20-\x7E]/g, "");
  },

  capitalizeFirst(str) {
    if (!str) return str;
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  },

  getSideTextValue(side) {
    return side === "back" ? this.backTextValue || "" : this.frontTextValue || "";
  },

  sideHasPersonalization(side) {
    return this.getSideTextValue(side).trim().length > 0;
  },

  sideHasEmoji(side) {
    const value = this.getSideTextValue(side);

    return Object.values(this.iconRegistry || {}).some((icon) => {
      return icon.marker && value.includes(icon.marker);
    });
  },

  sideHasTypedText(side) {
    let value = this.getSideTextValue(side);

    Object.values(this.iconRegistry || {}).forEach((icon) => {
      if (icon.marker) {
        value = value.replaceAll(icon.marker, "");
      }
    });

    return value.trim().length > 0;
  },

  getTextColorSummary(side) {
    if (!this.sideHasTypedText(side)) return "N/a";

    return side === "back"
      ? this.backTextColorName || "N/a"
      : this.frontTextColorName || "N/a";
  },

  getEmojiColorSummary(side) {
    if (!this.sideHasEmoji(side)) return "N/a";

    return side === "back"
      ? this.backEmojiColorName || "N/a"
      : this.frontEmojiColorName || "N/a";
  },

  downloadPDF(pdfBytes) {
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "shoelace-config.pdf";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  },

  async uploadPDF(pdfBytes, configId) {
    const uploadUrl =
      window.SHOELACE_CONFIG?.uploadPdfUrl || "/apps/shoelaces-upload-pdf";
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const formData = new FormData();

    formData.append("configId", configId);
    formData.append("pdf", blob, `${configId}.pdf`);

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || "Unable to upload PDF.");
    }

    return result.upload;
  },

  onClick(event) {
    if (!this.model) return;

    const rect = this.renderer.domElement.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster
      .intersectObjects(this.shoelaces, true)
      .filter((i) => i.object.visible);

    if (!intersects.length) return;

    const clickedObject = intersects[0].object;
    this.focusOnObject(clickedObject);
  },

  focusOnObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    box.getCenter(this.targetPosition);
    this.isMoving = true;
  },

  goToFrontView() {
    if (!this.model) return;
    if (this.isCameraAnimating) return;

    // Already front
    if (!this.isBackView) {
      this.activeTextSide = "front";
      this.updateTextInputAvailability();
      return;
    }

    this.isCameraAnimating = true;
    this.isBackView = false;
    this.activeTextSide = "front";

    this.unlockCameraDragLimits();

    this.goToCameraState("default", () => {
      this.setCameraDragLimits("front");
      this.updateTextInputAvailability();
      this.isCameraAnimating = false;
    });
  },

  goToBackView() {
    if (!this.model) return;
    if (this.isCameraAnimating) return;

    // Already back
    if (this.isBackView) {
      this.activeTextSide = "back";
      this.updateTextInputAvailability();
      return;
    }

    this.isCameraAnimating = true;
    this.isBackView = true;
    this.activeTextSide = "back";

    this.unlockCameraDragLimits();

    this.goToCameraState("back", () => {
      this.setCameraDragLimits("back");
      this.updateTextInputAvailability();
      this.isCameraAnimating = false;
    });
  },

  updateTextInputAvailability() {
    const frontInput = document.getElementById("shoelace-text");
    const backInput = document.getElementById("shoelace-text-back");
    const sideIndicator = document.getElementById("viewSideIndicator");

    if (!frontInput || !backInput) return;

    // Keep both inputs enabled
    frontInput.disabled = false;
    backInput.disabled = false;

    frontInput.classList.remove("input-disabled");
    backInput.classList.remove("input-disabled");

    // Optional: show which side is currently active
    if (this.isBackView) {
      frontInput.classList.remove("active-input");
      backInput.classList.add("active-input");
    } else {
      frontInput.classList.add("active-input");
      backInput.classList.remove("active-input");
    }

    if (sideIndicator) {
      sideIndicator.textContent = this.isBackView
        ? "Editing Back Side"
        : "Editing Front Side";
      sideIndicator.dataset.side = this.isBackView ? "back" : "front";
    }
  },

  getCartProperties(configId) {
    return this.getSummaryProperties(configId);
  },

  async addConfiguredProductToCart() {
    const addToCartButton = document.getElementById("addToCart");

    if (!addToCartButton) {
      console.error("Add to Cart button not found.");
      return;
    }

    if (!VARIANT_ID_WITH_CUSTOMIZATION) {
      window.showCartStatus(
        "Unable to add item",
        "Shoelace product variant ID is missing. Please open the app admin once to finish setup.",
        true,
      );
      return;
    }

    const configId =
      window.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : `shoelace-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      addToCartButton.disabled = true;
      addToCartButton.textContent = "Processing...";

      window.showCartStatus(
        "Step 1/2",
        "Uploading shoelace PDF...",
        false,
      );

      const pdfBytes = await this.generatePDF();
      const upload = await this.uploadPDF(pdfBytes, configId);
      const cartProperties = {
        ...this.getCartProperties(configId),
        _pdfUrl: upload.secureUrl,
        "Design PDF": upload.secureUrl,
      };

      window.showCartStatus(
        "Step 2/2",
        "Adding shoelace configuration to cart...",
        false,
      );

      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          id: VARIANT_ID_WITH_CUSTOMIZATION,
          quantity: 1,
          properties: cartProperties,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.description || "Unable to add item to cart.");
      }

      window.showCartStatus(
        "Success",
        "Shoelace configuration added to cart.",
        true,
      );

      console.log("Shoelace config ID:", configId);
      console.log("Added to cart:", result);
    } catch (error) {
      console.error("Add to cart error:", error);

      window.showCartStatus(
        "Error",
        error.message || "Something went wrong.",
        true,
      );
    } finally {
      addToCartButton.disabled = false;
      addToCartButton.textContent = "Add To Cart";
    }
  },

  getSummaryProperties(configId = null) {
    return {
      ...(configId
        ? {
            _configID: configId,
            "Design ID": configId,
          }
        : {}),

      Model: "Flat Shoelaces",
      "Main Color": this.activeColor || "N/a",

      "Front Text": this.frontTextValue || "N/a",
      "Front Text Color": this.getTextColorSummary("front"),
      "Front Emoji Color": this.getEmojiColorSummary("front"),

      "Back Text": this.backTextValue || "N/a",
      "Back Text Color": this.getTextColorSummary("back"),
      "Back Emoji Color": this.getEmojiColorSummary("back"),
    };
  },

  openSummaryModal() {
    const modal = document.getElementById("summaryModal");
    const table = document.getElementById("summaryTable");

    if (!modal || !table) {
      console.error("Summary modal or summary table not found.");
      return;
    }

    const properties = this.getSummaryProperties();

    table.innerHTML = Object.entries(properties)
      .map(([label, value]) => {
        return `
        <div class="summary-row">
          <span class="summary-label">${this.escapeHTML(label)}</span>
          <span class="summary-value">${this.escapeHTML(value)}</span>
        </div>
      `;
      })
      .join("");

    modal.classList.add("active");
  },

  closeSummaryModal() {
    const modal = document.getElementById("summaryModal");

    if (!modal) return;

    modal.classList.remove("active");
  },

  escapeHTML(value) {
    return String(value ?? "N/a")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },

  setupUI() {
    const directionalButton = document.querySelector(".directional-button");
    const textInput = document.getElementById("shoelace-text");
    const backTextInput = document.getElementById("shoelace-text-back");
    const emojiButtons = document.querySelectorAll(".emoji-btn");
    const backBtn = document.getElementById("backButton");
    const pdfBtn = document.getElementById("pdfBtn");
    const addToCartBtn = document.getElementById("addToCart");
    const summaryBtn = document.getElementById("position-btn");
    const closeSummaryBtn = document.getElementById("closeSummary");
    const summaryModal = document.getElementById("summaryModal");
    const summaryOverlay = document.querySelector(".summary-overlay");

    if (textInput) {
      textInput.addEventListener("focus", () => {
        this.activeTextSide = "front";
        this.goToFrontView();
      });

      textInput.addEventListener("input", (event) => {
        this.activeTextSide = "front";
        event.target.value = ShoelaceText.clampTextToMaxWidth(
          this,
          event.target.value.toUpperCase(),
        );
        ShoelaceText.updateShoelaceText(this, event.target.value, "front");
      });
    }

    if (backTextInput) {
      backTextInput.addEventListener("focus", () => {
        this.activeTextSide = "back";
        this.goToBackView();
      });

      backTextInput.addEventListener("input", (event) => {
        this.activeTextSide = "back";
        event.target.value = ShoelaceText.clampTextToMaxWidth(
          this,
          event.target.value.toUpperCase(),
        );
        ShoelaceText.updateShoelaceText(this, event.target.value, "back");
      });
    }

    if (pdfBtn) {
      pdfBtn.addEventListener("click", async () => {
        const pdfBytes = await ShoelaceApp.generatePDF();
        ShoelaceApp.downloadPDF(pdfBytes);
      });
    }

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.backShoe();
      });
    }

    if (directionalButton) {
      directionalButton.addEventListener("click", () => {
        this.toggleBackCameraView();
      });
    }

    if (addToCartBtn) {
      addToCartBtn.addEventListener("click", () => {
        this.addConfiguredProductToCart();
      });
    }

    if (summaryBtn) {
      summaryBtn.addEventListener("click", () => {
        this.openSummaryModal();
      });
    }

    if (closeSummaryBtn) {
      closeSummaryBtn.addEventListener("click", () => {
        this.closeSummaryModal();
      });
    }

    if (summaryOverlay) {
      summaryOverlay.addEventListener("click", () => {
        this.closeSummaryModal();
      });
    }

    emojiButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const iconName = btn.dataset.icon;
        const icon = this.iconRegistry[iconName];

        if (!icon) return;

        const side = this.activeTextSide === "back" ? "back" : "front";
        const activeInput = side === "back" ? backTextInput : textInput;

        if (!activeInput) return;

        const newValue = activeInput.value + icon.marker;

        if (!ShoelaceText.isTextWithinMaxWidth(this, newValue)) {
          return;
        }

        activeInput.value = newValue;

        ShoelaceText.updateShoelaceText(this, newValue, side);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        summaryModal?.classList.contains("active")
      ) {
        this.closeSummaryModal();
      }
    });
  },

  onResize() {
    const isMobile = window.innerWidth < 992 || window.innerHeight < 430;
    const isPortrait = window.innerHeight > window.innerWidth;

    this.viewport_width = isMobile ? 0 : 500;
    this.viewport_height = isMobile && isPortrait ? 2 : 1;

    const width = window.innerWidth - this.viewport_width;
    const height = window.innerHeight / this.viewport_height;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    const btn = document.querySelector(".icon-container");
    if (btn) {
      btn.style.right = this.viewport_width + 20 + "px";
    }
  },

  animate() {
    requestAnimationFrame(() => this.animate());

    const target = this.controls.target;
    this.controls.update();

    this.controls2.target.set(target.x, target.y, target.z);
    this.controls2.update();

    if (this.isMoving) {
      this.controls.target.lerp(this.targetPosition, 0.1);

      if (this.controls.target.distanceTo(this.targetPosition) < 0.01) {
        this.isMoving = false;
      }
    }

    this.renderer.render(this.scene, this.camera);
  },
};

const startApp = () => {
  console.log("Starting ShoelaceApp");
  ShoelaceApp.init();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}
