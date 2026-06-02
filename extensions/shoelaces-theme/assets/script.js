const config = JSON.parse(
  document.getElementById("configurator-data").textContent,
);

const VARIANT_ID_WITH_CUSTOMIZATION =
  window.SHOELACE_CONFIG && window.SHOELACE_CONFIG.variantId
    ? Number(window.SHOELACE_CONFIG.variantId)
    : null;

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
  shoelaceParts: {
    shoelace_1: [],
    shoelace_2: [],
    shoelace_3: [],
    shoelace_4: [],
  },
  shoelacePivotGroups: {},
  previewDuplicateShoelaces: [],
  previewDuplicateTextTargetLaces: [],
  shoelacePreviewState: null,
  shoelaceModelTransform: {
    x: 0,
    y: 0,
    z: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  },
  shoelaceTextTransform: {
    x: -0.24,
    backX: -0.1,
    y: 0.02,
    z: 0.1,
    rotationX: 90,
    rotationY: 0,
    rotationZ: 0,
  },
  duplicateShoelaceTextTransforms: {
    shoelace_3: {
      x: 0.64,
      backX: 0.5,
      y: 0.01,
      z: 0.11,
      rotationX: -90,
      rotationY: 0,
      rotationZ: 0,
    },
    shoelace_4: {
      x: 0.64,
      backX: 0.5,
      y: 0.01,
      z: 0.11,
      rotationX: -90,
      rotationY: 0,
      rotationZ: 0,
    },
  },
  shoelaceMeshTransforms: {
    shoelace_1: {
      x: 0,
      y: 0,
      z: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    },
    shoelace_2: {
      x: 0,
      y: 0,
      z: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    },
    shoelace_3: {
      x: 3.62,
      y: -0.06,
      z: 3.85,
      rotationX: 0,
      rotationY: -129,
      rotationZ: 0,
    },
    shoelace_4: {
      x: 3.32,
      y: -0.06,
      z: 1.39,
      rotationX: 0,
      rotationY: -115,
      rotationZ: 0,
    },
  },
  shoelacePreviewMeshTransforms: {
    shoelace_1: {
      x: -2.77,
      y: -0.34,
      z: -3.77,
      rotationX: 0,
      rotationY: -101,
      rotationZ: 0,
    },
    shoelace_2: {
      x: -0.51,
      y: -0.36,
      z: -2.29,
      rotationX: 0,
      rotationY: 43,
      rotationZ: 0,
    },
  },
  agletMeshTransforms: {
    aglet_1: {
      x: -0.93,
      y: 0,
      z: -0.01,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    },
    aglet_2: {
      x: 0.93,
      y: 0,
      z: 0.01,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    },
    aglet_3: {
      x: -0.93,
      y: 0,
      z: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    },
    aglet_4: {
      x: 0.93,
      y: 0,
      z: 0.01,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    },
  },

  mouseDown: false,
  startX: 0,
  startY: 0,
  clickThreshold: 5,

  viewport_width: 0,
  viewport_height: 1,

  targetPosition: new THREE.Vector3(),
  isMoving: false,
  isBackView: false,
  isShoePreviewActive: false,
  isCameraAnimating: false,
  cameraAnimationId: 0,

  cameraStates: {},

  textTargetLaces: [],
  frontTextValue: "",
  backTextValue: "",
  frontTextMeshes: [],
  backTextMeshes: [],
  frontPreviewTextMeshes: [],
  backPreviewTextMeshes: [],
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
  customEmojiCounter: 0,
  customEmojiUploads: {},
  activeTextSide: "front",
  activeShoeColor: "#ffffff",
  activeColor: "",
  activeModelColorHex: "#f0f0f0",

  frontTextColorName: "Black",
  backTextColorName: "Black",
  frontEmojiColorName: "Black",
  backEmojiColorName: "Black",

  pdfFrontCamera: null,
  pdfBackCamera: null,

  activeAgletStyle: "default",
  activeAgletColor: "",
  activeAgletColorName: "",
  agletMeshes: [],
  agletStyles: {
    normal: ["flat"],
    default: ["default"],
    classic: ["classic"],
    bullet: ["bullet"],
  },
  agletStyleLabels: {
    none: "None",
    normal: "Normal Aglet",
    default: "Default Aglet",
    classic: "Classic Aglet",
    bullet: "Bullet Aglet",
  },

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

    if (this.modelLoading.loaded >= this.modelLoading.total) {
      this.hideLoader();
    }
  },

  init() {
    // 1. Get the config safely
    const configElement = document.getElementById("configurator-data");

    if (!configElement) {
      return;
    }

    try {
      this.config = JSON.parse(configElement.textContent);
    } catch (error) {
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
    this.disableImageDragging();
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

    if (window.RoomEnvironment) {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(
        new window.RoomEnvironment(),
        0.04,
      ).texture;
      pmremGenerator.dispose();
    }

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
    this.ambientLight = ambient;

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
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
    this.dirLight = dirLight;

    const backLight = new THREE.DirectionalLight(0xffffff, 1.15);
    backLight.position.set(0, 10, -5);
    this.scene.add(backLight);
    this.backLight = backLight;
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
    this.floor = floor;
  },

  setPreviewLighting() {
    if (this.ambientLight) {
      this.ambientLight.intensity = 3;
    }

    if (this.dirLight) {
      this.dirLight.intensity = 5;
      this.dirLight.position.set(-4, 8, 7);
    }

    if (this.backLight) {
      this.backLight.intensity = 0.35;
    }

    if (!this.previewHemisphereLight) {
      this.previewHemisphereLight = new THREE.HemisphereLight(
        0xffffff,
        0xd8d8d8,
        0.55,
      );
      this.scene.add(this.previewHemisphereLight);
    }

    this.previewHemisphereLight.visible = true;

    this.renderer.toneMappingExposure = 1.08;
  },

  restoreConfiguratorLighting() {
    if (this.ambientLight) {
      this.ambientLight.intensity = 10;
    }

    if (this.dirLight) {
      this.dirLight.intensity = 1.15;
      this.dirLight.position.set(0, 10, 5);
    }

    if (this.backLight) {
      this.backLight.intensity = 1.15;
      this.backLight.position.set(0, 10, -5);
    }

    if (this.previewHemisphereLight) {
      this.previewHemisphereLight.visible = false;
    }

    this.renderer.toneMappingExposure = 1;
  },

  isJordanShoeColorMesh(mesh) {
    if (!mesh?.isMesh) return false;

    const rawName = String(mesh.name || "").toLowerCase();
    const parentName = String(mesh.parent?.name || "").toLowerCase();

    if (
      rawName === "object_40.001" ||
      rawName === "object_40.002" ||
      rawName === "object_40001" ||
      rawName === "object_40002" ||
      parentName === "shoelace_18.001"
    ) {
      return false;
    }

    return true;
  },

  applyJordanShoeColor(color) {
    if (!this.shoe || !color) return;

    this.activeShoeColor = color;

    this.shoe.traverse((child) => {
      if (!this.isJordanShoeColorMesh(child)) return;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((mat) => {
        if (!mat?.color) return;

        mat.color.set(color);
        mat.needsUpdate = true;
      });
    });
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

    this.isBackView = !this.isBackView;
    this.activeTextSide = this.isBackView ? "back" : "front";
    this.updateDirectionalTooltip();

    this.unlockCameraDragLimits();

    if (this.isBackView) {
      this.goToCameraState("back", () => {
        this.setCameraDragLimits("back");
        this.updateTextInputAvailability();
      });
    } else {
      this.goToCameraState("default", () => {
        this.setCameraDragLimits("front");
        this.updateTextInputAvailability();
      });
    }
  },

  goToCameraState(name, onComplete = null) {
    const state = this.cameraStates[name];
    if (!state) {
      this.isCameraAnimating = false;
      return false;
    }

    const animationId = ++this.cameraAnimationId;
    this.isCameraAnimating = true;

    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.controls.target);

    let completedTweens = 0;

    const finish = () => {
      if (animationId !== this.cameraAnimationId) return;

      completedTweens++;

      if (completedTweens === 2) {
        if (typeof onComplete === "function") {
          onComplete();
        }

        if (animationId === this.cameraAnimationId) {
          this.isCameraAnimating = false;
        }
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

    return true;
  },

  loadModel() {
    this.shoelaces = [];
    this.shoelaceParts = {
      shoelace_1: [],
      shoelace_2: [],
      shoelace_3: [],
      shoelace_4: [],
    };
    this.shoelacePivotGroups = {};
    this.agletMeshes = [];
    this.previewDuplicateShoelaces = [];
    this.previewDuplicateTextTargetLaces = [];
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

    modelEntries.forEach(([key, modelPath]) => {
      this.loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          this.logModelMeshes(key, model);

          model.traverse((child) => {
            if (!child.isMesh) return;

            const isLace = child.name.toLowerCase().includes("shoelace");
            const placementKey = this.getShoelacePlacementKey(child.name);

            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];

            materials.forEach((mat) => {
              if (!mat) return;

              if (key !== "shoe") {
                mat.side = THREE.DoubleSide;
              }

              if (key === "shoelace" && isShoelaceFabric(mat.name)) {
                mat.color.set(0xf0f0f0);
              }

              if (key !== "shoe") {
                mat.needsUpdate = true;
              }
            });

            if (isLace) {
              this.shoelaces.push(child);

              const name = this.getEditableShoelaceKey(child.name);

              if (name === "shoelace_1" || name === "shoelace_2") {
                this.textTargetLaces.push(child);
              }
            }

            if (placementKey && this.shoelaceParts[placementKey]) {
              this.shoelaceParts[placementKey].push(child);
            }

            if (key === "shoelace") {
              this.registerAgletMesh(child);
              this.updateAgletMaterial(child);
            }

            child.castShadow = true;
            child.receiveShadow = true;
          });

          this.scene.add(model);

          if (key === "shoelace") {
            this.model = model;
            this.applyAgletStyle(this.activeAgletStyle);
            this.applyAgletColor(this.activeAgletColor, this.activeAgletColorName);
            this.createShoelacePivotGroups();
            this.attachAgletsToShoelacePivots();
            this.applyShoelaceModelTransform(false);
            this.applyShoelaceMeshTransforms(false, false);

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
            model.updateMatrixWorld(true);
            this.shoe = model;
            this.shoe.visible = false;

            if (window.applyShoePreviewLaceColor) {
              window.applyShoePreviewLaceColor(
                this.shoe,
                this.activeModelColorHex,
              );
            }

            this.applyJordanShoeColor(this.activeShoeColor);

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

          this.markModelLoaded(key);
        },
        undefined,
        () => {
          this.markModelLoaded(`${key} failed`);
        },
      );
    });
  },

  logModelMeshes(key, model) {
    const meshes = [];

    model.traverse((child) => {
      if (!child.isMesh) return;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      meshes.push({
        mesh: child.name || "(unnamed mesh)",
        parent: child.parent?.name || "(no parent)",
        visible: child.visible,
        materials: materials
          .map((mat) => mat?.name || "(unnamed material)")
          .join(", "),
        geometry: child.geometry?.type || "(no geometry)",
      });
    });

  },

  normalizeAgletName(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/\.[0-9]+$/, "")
      .trim();
  },

  getAgletStyleFromNode(node) {
    let current = node;

    while (current) {
      const normalized = this.normalizeAgletName(current.name);

      if (normalized) {
        const style = Object.entries(this.agletStyles).find(([, meshNames]) =>
          meshNames.some((styleName) =>
            normalized === styleName || normalized.includes(styleName),
          ),
        )?.[0];

        if (style) {
          return style;
        }
      }

      current = current.parent;
    }

    return "";
  },

  registerAgletMesh(mesh) {
    if (!mesh?.isMesh) return;

    const style = this.getAgletStyleFromNode(mesh);
    const placementKey = this.getAgletPlacementKey(mesh);
    const hasAgletPlacement =
      /aglet_[1-4]/.test(this.normalizeAgletName(mesh.name)) ||
      /^(flat|default|classic|bullet)[_-][1-4]$/.test(
        this.normalizeAgletName(mesh.parent?.name),
      );

    if (!style && !hasAgletPlacement) return;

    mesh.userData.agletStyle = style || this.activeAgletStyle || "default";
    mesh.userData.shoelacePlacementKey = placementKey;
    this.agletMeshes.push(mesh);
  },

  updateAgletMaterial(mesh) {
    if (!mesh?.isMesh || !mesh.material) return;

    const style = this.getAgletStyleFromNode(mesh);
    const placementKey = this.getAgletPlacementKey(mesh);
    const hasAgletPlacement =
      /aglet_[1-4]/.test(this.normalizeAgletName(mesh.name)) ||
      /^(flat|default|classic|bullet)[_-][1-4]$/.test(
        this.normalizeAgletName(mesh.parent?.name),
      );

    if (!style && !hasAgletPlacement) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    materials.forEach((material, index) => {
      if (!material) return;

      const isFixedGrayMaterial =
        String(material.name || "").toLowerCase() === "material.004";

      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
      }

      const hasColorTexture = Boolean(material.map);
      const color = isFixedGrayMaterial
        ? material.color?.clone() || new THREE.Color(0xd4af37)
        : hasColorTexture
          ? new THREE.Color(0xffffff)
          : material.color?.clone() || new THREE.Color(0xd4af37);

      if (
        !isFixedGrayMaterial &&
        !hasColorTexture &&
        color.r + color.g + color.b < 0.15
      ) {
        color.setHex(0xd4af37);
      }

      const newMaterial = new THREE.MeshStandardMaterial({
        color,
        roughness: material.roughness ?? 0.18,
        metalness: material.metalness ?? 0.82,
        envMapIntensity: 3.35,
        emissive: new THREE.Color(0xfff1c4),
        emissiveIntensity: 0.08,
        side: material.side || THREE.FrontSide,
        transparent: material.transparent,
        opacity: material.opacity,
        map: isFixedGrayMaterial ? null : material.map || null,
        normalMap: isFixedGrayMaterial ? null : material.normalMap || null,
        aoMap: isFixedGrayMaterial ? null : material.aoMap || null,
        metalnessMap: isFixedGrayMaterial ? null : material.metalnessMap || null,
        roughnessMap: isFixedGrayMaterial ? null : material.roughnessMap || null,
        alphaMap: isFixedGrayMaterial ? null : material.alphaMap || null,
      });

      newMaterial.name = material.name || "";

      newMaterial.userData.agletMaterialDefaults = {
        roughness: newMaterial.roughness,
        metalness: newMaterial.metalness,
        envMapIntensity: newMaterial.envMapIntensity,
        emissive: newMaterial.emissive.clone(),
        emissiveIntensity: newMaterial.emissiveIntensity,
      };

      if (Array.isArray(mesh.material)) {
        mesh.material[index] = newMaterial;
      } else {
        mesh.material = newMaterial;
      }
    });
  },

  prepareShoelaceSwatchMaterial(mesh) {
    if (!mesh?.material) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    materials.forEach((material) => {
      if (!material?.color) return;

      if (!material.map || material.userData.shoelaceSwatchMaterialPrepared) {
        material.needsUpdate = true;
        return;
      }

      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "diffuseColor *= sampledDiffuseColor;",
          [
            "float shoelaceMapLuma = dot(sampledDiffuseColor.rgb, vec3(0.299, 0.587, 0.114));",
            "diffuseColor.rgb *= shoelaceMapLuma;",
            "diffuseColor.a *= sampledDiffuseColor.a;",
          ].join("\n"),
        );
      };

      material.customProgramCacheKey = () => "shoelace-grayscale-map";
      material.userData.shoelaceSwatchMaterialPrepared = true;
      material.needsUpdate = true;
    });
  },

  setMeshColor(mesh, color) {
    if (!mesh?.material || !color) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const colorValue = new THREE.Color(color);
    const luminance =
      colorValue.r * 0.2126 + colorValue.g * 0.7152 + colorValue.b * 0.0722;
    const isVeryDark = luminance < 0.04;
    const isVeryLight = luminance > 0.88;

    materials.forEach((material) => {
      if (!material?.color) return;

      if (mesh.userData.shoePreviewAgletColorMesh) {
        material.map = null;
        material.normalMap = null;
        material.aoMap = null;
        material.metalnessMap = null;
        material.roughnessMap = null;
        material.alphaMap = null;
      }

      material.color.copy(
        isVeryLight
          ? colorValue.clone().lerp(new THREE.Color(0xb8b8b8), 0.55)
          : colorValue,
      );

      if (isVeryDark || isVeryLight) {
        material.metalness = 0.12;
        material.roughness = isVeryLight ? 0.54 : 0.68;
        material.envMapIntensity = isVeryLight ? 0.9 : 0.65;

        if (material.emissive) {
          material.emissive.set(0x000000);
          material.emissiveIntensity = 0;
        }
      } else if (material.userData.agletMaterialDefaults) {
        const defaults = material.userData.agletMaterialDefaults;

        material.metalness = defaults.metalness;
        material.roughness = defaults.roughness;
        material.envMapIntensity = defaults.envMapIntensity;

        if (material.emissive) {
          material.emissive.copy(defaults.emissive);
          material.emissiveIntensity = defaults.emissiveIntensity;
        }
      }

      material.needsUpdate = true;
    });
  },

  applyAgletStyle(style = "default") {
    const nextStyle = this.agletStyleLabels[style] ? style : "default";

    this.activeAgletStyle = nextStyle;

    this.agletMeshes.forEach((mesh) => {
      mesh.visible =
        nextStyle !== "none" && mesh.userData.agletStyle === nextStyle;
    });

    this.syncAgletColors();
  },

  applyAgletColor(color, colorName = "") {
    if (color) {
      this.activeAgletColor = color;
      this.activeAgletColorName = colorName || color;
    }

    this.syncAgletColors();
  },

  applyAgletColorToStyle(style, color) {
    if (!color) return;

    this.agletMeshes.forEach((mesh) => {
      const meshStyle = mesh.userData.agletStyle || this.getAgletStyleFromNode(mesh);

      if (meshStyle !== style) return;

      this.setMeshColor(mesh, color);
    });
  },

  isAgletLikeMesh(mesh) {
    if (!mesh?.isMesh) return false;

    const normalizedName = this.normalizeAgletName(mesh.name);
    const materialNames = (Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    )
      .map((material) => this.normalizeAgletName(material?.name))
      .join(" ");

    if (mesh.userData.agletStyle || this.getAgletStyleFromNode(mesh)) {
      return true;
    }

    if (/aglet_[1-4]/.test(normalizedName)) {
      return true;
    }

    if (this.getAgletPlacementKey(mesh)) {
      return /aglet|cylinder|sphere|tip|cap/.test(
        `${normalizedName} ${materialNames}`,
      );
    }

    return false;
  },

  isEditableShoelaceColorMesh(mesh) {
    if (!mesh?.isMesh) return false;

    const placementKey = this.getShoelacePlacementKey(mesh.name);

    if (
      placementKey !== "shoelace_1" &&
      placementKey !== "shoelace_2" &&
      placementKey !== "shoelace_3" &&
      placementKey !== "shoelace_4"
    ) {
      return false;
    }

    return !this.isAgletLikeMesh(mesh);
  },

  getEditableShoelaceColorMeshes() {
    const meshes = new Set();

    if (this.model) {
      this.model.traverse((child) => {
        if (this.isEditableShoelaceColorMesh(child)) {
          meshes.add(child);
        }
      });
    }

    this.shoelaces.forEach((mesh) => {
      if (this.isEditableShoelaceColorMesh(mesh)) {
        meshes.add(mesh);
      }
    });

    return Array.from(meshes);
  },

  isShoePreviewAgletLikeMesh(mesh) {
    if (!mesh?.isMesh) return false;

    const rawName = this.normalizeAgletName(mesh.name);
    const materialNames = (Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    )
      .map((material) => this.normalizeAgletName(material?.name))
      .join(" ");

    if (mesh.userData.shoePreviewAgletColorMesh) {
      return true;
    }

    if (/aglet|tip|cap/.test(`${rawName} ${materialNames}`)) {
      mesh.userData.shoePreviewAgletColorMesh = true;
      return true;
    }

    return false;
  },

  getAllAgletColorMeshes() {
    const meshes = new Set(this.agletMeshes);

    if (this.model) {
      this.model.traverse((child) => {
        if (this.isAgletLikeMesh(child)) {
          meshes.add(child);
        }
      });
    }

    if (this.shoe) {
      this.shoe.traverse((child) => {
        if (this.isShoePreviewAgletLikeMesh(child)) {
          meshes.add(child);
        }
      });
    }

    return Array.from(meshes);
  },

  getAgletColorForMesh(mesh) {
    const meshStyle =
      mesh?.userData?.agletStyle || this.getAgletStyleFromNode(mesh);

    if (meshStyle === "default") {
      return this.activeModelColorHex;
    }

    if (!meshStyle && this.activeAgletStyle === "default") {
      return this.activeModelColorHex;
    }

    return this.activeAgletColor || null;
  },

  syncAgletColors() {
    this.getAllAgletColorMeshes().forEach((mesh) => {
      if (mesh.userData.keepOriginalAgletMaterial) return;

      const color = this.getAgletColorForMesh(mesh);

      if (!color) return;

      this.setMeshColor(mesh, color);
    });
  },

  getAgletStyleLabel() {
    return this.agletStyleLabels[this.activeAgletStyle] || "Default Aglet";
  },

  getMainColorSummary() {
    return this.activeColor || "N/a";
  },

  getAgletStyleSummary() {
    if (this.activeAgletStyle === "none" || this.activeAgletStyle === "default") {
      return "N/a";
    }

    return this.getAgletStyleLabel();
  },

  getAgletColorSummary() {
    return this.activeAgletColor ? this.activeAgletColorName || this.activeAgletColor : "N/a";
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
        displayName: name,
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
        this.iconTemplates[icon.name] = await this.createIconTemplate(icon);
      } catch (error) {
      }
    }
  },

  createIconTemplate(icon) {
    if (icon.rawSvg) {
      return this.createSVGMeshFromText(icon.rawSvg);
    }

    return this.createSVGMesh(icon.svg);
  },

  async createIconMesh(name) {
    const icon = this.iconRegistry[name];

    if (!icon) return null;

    if (!this.iconTemplates[name]) {
      this.iconTemplates[name] = await this.createIconTemplate(icon);
    }

    return this.iconTemplates[name].clone(true);
  },

  buildSVGMesh(data) {
    const rawGroup = new THREE.Group();

    data.paths.forEach((path) => {
      let shapes = window.SVGLoaderCreateShapes(path);

      if (!shapes.length && path.subPaths?.length) {
        shapes = path.subPaths
          .filter((subPath) => subPath?.getPoints?.().length > 2)
          .map((subPath) => {
            const shape = new THREE.Shape(subPath.getPoints());
            shape.autoClose = true;

            return shape;
          });
      }

      if (
        !shapes.length &&
        path.userData?.style?.stroke !== "none" &&
        window.SVGLoader.pointsToStroke
      ) {
        shapes = path.subPaths
          ?.map((subPath) => {
            return window.SVGLoader.pointsToStroke(
              subPath.getPoints(),
              path.userData.style,
            );
          })
          .filter(Boolean) || [];
      }

      shapes.forEach((shape) => {
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: 1,
          bevelEnabled: false,
        });

        const material = new THREE.MeshBasicMaterial({
          color: this.textColor || 0x111111,
          toneMapped: false,
        });

        material.userData.usesExactSwatchColor = true;

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
    const SVG_DEPTH = 2.5;

    if (maxSize > 0) {
      const iconScale = SVG_BASE_SIZE / maxSize;
      rawGroup.scale.set(iconScale, iconScale, SVG_DEPTH);
    }

    const scaledBox = new THREE.Box3().setFromObject(rawGroup);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);

    rawGroup.position.x -= scaledCenter.x;
    rawGroup.position.y -= scaledCenter.y;
    rawGroup.position.z -= scaledCenter.z;

    const finalGroup = new THREE.Group();
    finalGroup.add(rawGroup);

    return finalGroup;
  },

  createSVGMeshFromText(svgText) {
    return new Promise((resolve, reject) => {
      try {
        const loader = new window.SVGLoader();
        const data = loader.parse(svgText);
        resolve(this.buildSVGMesh(data));
      } catch (error) {
        reject(error);
      }
    });
  },

  createSVGMesh(url) {
    return new Promise((resolve, reject) => {
      const loader = new window.SVGLoader();

      loader.load(url, (data) => {
        resolve(this.buildSVGMesh(data));
      }, undefined, reject);
    });
  },

  sanitizeCustomSVG(svgText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const parseError = doc.querySelector("parsererror");
    const svg = doc.documentElement;

    if (parseError || !svg || svg.nodeName.toLowerCase() !== "svg") {
      return "";
    }

    doc
      .querySelectorAll("script, foreignObject, iframe, object, embed")
      .forEach((node) => node.remove());

    doc.querySelectorAll("*").forEach((node) => {
      [...node.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = String(attr.value || "").trim().toLowerCase();

        if (name.startsWith("on") || value.startsWith("javascript:")) {
          node.removeAttribute(attr.name);
        }
      });
    });

    return new XMLSerializer().serializeToString(svg);
  },

  setCustomEmojiFeedback(message, isError = false) {
    const feedback = document.getElementById("customEmojiFeedback");

    if (!feedback) return;

    feedback.textContent = message || "";
    feedback.classList.toggle("is-error", Boolean(isError));
  },

  clearCustomEmojiFeedback() {
    this.setCustomEmojiFeedback("");
  },

  insertIconIntoActiveInput(iconName) {
    const icon = this.iconRegistry[iconName];

    if (!icon) return;

    const textInput = document.getElementById("shoelace-text");
    const backTextInput = document.getElementById("shoelace-text-back");
    const side = this.activeTextSide === "back" ? "back" : "front";
    const activeInput = side === "back" ? backTextInput : textInput;

    if (!activeInput) return;

    const newValue = activeInput.value + icon.marker;

    if (!ShoelaceText.isTextWithinMaxWidth(this, newValue)) {
      this.setCustomEmojiFeedback("That design is at the max width.", true);
      return;
    }

    activeInput.value = newValue;
    this.clearCustomEmojiFeedback();
    ShoelaceText.updateShoelaceText(this, newValue, side);
  },

  async registerCustomEmojiFile(file) {
    if (!file) return;

    const isSvg =
      file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");

    if (!isSvg) {
      this.setCustomEmojiFeedback("Please use an SVG file.", true);
      return;
    }

    let name = "";

    try {
      const rawSvg = await file.text();
      const safeSvg = this.sanitizeCustomSVG(rawSvg);

      if (!safeSvg) {
        this.setCustomEmojiFeedback("That SVG could not be read.", true);
        return;
      }

      this.customEmojiCounter += 1;

      name = `ICON_${this.customEmojiCounter}`;
      const marker = name;
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(safeSvg)}`;

      this.iconRegistry[name] = {
        name,
        displayName: name,
        marker,
        svg: svgDataUrl,
        rawSvg: safeSvg,
        cloudinaryUrl: "",
        cloudinaryPublicId: "",
        scale: 0.006,
        width: 0.3,
        x: 0,
        y: 0.1,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: Math.PI,
      };

      this.iconTemplates[name] = await this.createIconTemplate(
        this.iconRegistry[name],
      );

      this.addCustomEmojiButton(this.iconRegistry[name]);
      this.setCustomEmojiFeedback("Custom SVG added. Select it to place it on the lace.");
    } catch (error) {
      if (name) {
        delete this.iconRegistry[name];
        delete this.iconTemplates[name];
        delete this.customEmojiUploads[name];

        if (name === `ICON_${this.customEmojiCounter}`) {
          this.customEmojiCounter = Math.max(0, this.customEmojiCounter - 1);
        }
      }

      this.setCustomEmojiFeedback("That SVG could not be added.", true);
    }
  },

  async uploadCustomEmoji(svgBlob, iconName, configId = "") {
    const uploadUrl =
      window.SHOELACE_CONFIG?.uploadEmojiUrl ||
      window.SHOELACE_CONFIG?.uploadPdfUrl ||
      "/apps/shoelaces-upload-pdf";
    const formData = new FormData();

    formData.append("uploadType", "emoji");
    formData.append("iconName", iconName);
    formData.append("configId", configId || "pending");
    formData.append("emoji", svgBlob, `${iconName}.svg`);

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    const responseText = await response.text();
    let result = null;

    try {
      result = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
    }

    if (!response.ok || !result?.ok) {
      const errorMessage =
        result?.error ||
        responseText ||
        `Custom emoji upload failed with status ${response.status}.`;

      throw new Error(errorMessage);
    }

    return result.upload;
  },

  getUsedCustomEmojiIcons() {
    const text = `${this.frontTextValue || ""}${this.backTextValue || ""}`;

    return Object.values(this.iconRegistry || {}).filter((icon) => {
      return icon.rawSvg && icon.marker && text.includes(icon.marker);
    });
  },

  async uploadUsedCustomEmojis(configId) {
    const icons = this.getUsedCustomEmojiIcons();

    for (const icon of icons) {
      if (icon.cloudinaryUrl) continue;

      const svgBlob = new Blob([icon.rawSvg], { type: "image/svg+xml" });
      const upload = await this.uploadCustomEmoji(svgBlob, icon.name, configId);

      icon.cloudinaryUrl = upload.secureUrl;
      icon.cloudinaryPublicId = upload.publicId;
      this.customEmojiUploads[icon.name] = upload.secureUrl;
    }

    return icons;
  },

  getCustomEmojiUploadEntries() {
    const usedIcons = this.getUsedCustomEmojiIcons();

    return usedIcons
      .filter((icon) => icon.cloudinaryUrl)
      .map((icon) => [icon.displayName || icon.name, icon.cloudinaryUrl]);
  },

  getCustomEmojiUploadSummary() {
    const entries = this.getCustomEmojiUploadEntries();

    if (!entries.length) return "N/a";

    return entries.map(([name, url]) => `${name}: ${url}`).join(" | ");
  },

  addCustomEmojiButton(icon) {
    const container = document.getElementById("shoelace-emoji");

    if (!container || !icon) return;

    const button = document.createElement("button");
    const image = document.createElement("img");

    button.type = "button";
    button.className = "emoji-btn custom-emoji-btn";
    button.dataset.icon = icon.name;
    button.dataset.marker = icon.marker;
    button.dataset.svg = icon.svg;
    button.setAttribute("aria-label", "Custom SVG emoji");

    image.src = icon.svg;
    image.alt = "Custom SVG emoji";

    button.appendChild(image);
    button.addEventListener("click", () => {
      this.insertIconIntoActiveInput(icon.name);
    });

    container.appendChild(button);
  },

  setupCustomEmojiUpload() {
    const dropzone = document.getElementById("customEmojiDropzone");
    const input = document.getElementById("customEmojiInput");

    if (!dropzone || !input) return;

    const handleFiles = (files) => {
      const [file] = files || [];
      this.registerCustomEmojiFile(file);
    };

    dropzone.addEventListener("click", () => input.click());
    dropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    });

    input.addEventListener("change", (event) => {
      handleFiles(event.target.files);
      input.value = "";
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("dragover");
      });
    });

    dropzone.addEventListener("drop", (event) => {
      handleFiles(event.dataTransfer?.files);
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
      ["Main Color", this.getMainColorSummary()],
      ["Aglet Style", this.getAgletStyleSummary()],
      ["Aglet Color", this.getAgletColorSummary()],

      ["Front Text", this.frontTextValue || "N/a"],
      ["Front Text Color", this.getTextColorSummary("front")],
      ["Front Emoji Color", this.getEmojiColorSummary("front")],

      ["Back Text", this.backTextValue || "N/a"],
      ["Back Text Color", this.getTextColorSummary("back")],
      ["Back Emoji Color", this.getEmojiColorSummary("back")],
      ["Custom Emoji Files", this.getCustomEmojiUploadSummary()],
    ];

    data.forEach(([label, value]) => {
      page.drawText(this.pdfSafeText(label), {
        x: labelX,
        y,
        size: 11,
        font: bold,
      });

      page.drawText(this.pdfSafeText(value, label !== "Custom Emoji Files"), {
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

  pdfSafeText(value, formatIcons = true) {
    if (!value) return "N/a";

    const text = formatIcons ? this.formatEmojiMarkers(value) : String(value);

    return text.replace(/[^\x20-\x7E]/g, "");
  },

  formatEmojiMarkers(value) {
    if (!value) return "N/a";

    let text = String(value);

    if (this.iconRegistry) {
      Object.values(this.iconRegistry)
        .sort((a, b) => String(b.marker).length - String(a.marker).length)
        .forEach((icon) => {
          if (icon.marker && icon.name) {
            text = text.replaceAll(
              icon.marker,
              `*${icon.displayName || icon.name}*`,
            );
          }
        });
    }

    return text;
  },

  capitalizeFirst(str) {
    if (!str) return str;
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  },

  getSideTextValue(side) {
    return side === "back"
      ? this.backTextValue || ""
      : this.frontTextValue || "";
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

    Object.values(this.iconRegistry || {})
      .sort((a, b) => String(b.marker).length - String(a.marker).length)
      .forEach((icon) => {
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

    const responseText = await response.text();
    let result = null;

    try {
      result = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
    }

    if (!response.ok || !result?.ok) {
      const errorMessage =
        result?.error ||
        responseText ||
        `PDF upload failed with status ${response.status}.`;

      throw new Error(errorMessage);
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
      this.updateDirectionalTooltip();
      return;
    }

    this.isBackView = false;
    this.activeTextSide = "front";
    this.updateDirectionalTooltip();

    this.unlockCameraDragLimits();

    this.goToCameraState("default", () => {
      this.setCameraDragLimits("front");
      this.updateTextInputAvailability();
    });
  },

  goToBackView() {
    if (!this.model) return;
    if (this.isCameraAnimating) return;

    // Already back
    if (this.isBackView) {
      this.activeTextSide = "back";
      this.updateTextInputAvailability();
      this.updateDirectionalTooltip();
      return;
    }

    this.isBackView = true;
    this.activeTextSide = "back";
    this.updateDirectionalTooltip();

    this.unlockCameraDragLimits();

    this.goToCameraState("back", () => {
      this.setCameraDragLimits("back");
      this.updateTextInputAvailability();
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

    this.clearCustomEmojiFeedback();

    if (sideIndicator) {
      sideIndicator.textContent = this.isBackView
        ? "Editing Back Side"
        : "Editing Front Side";
      sideIndicator.dataset.side = this.isBackView ? "back" : "front";
    }
  },

  updateDirectionalTooltip() {
    if (!this.directionalTooltip) return;

    this.directionalTooltip.textContent = this.isBackView
      ? "View Front"
      : "View Back";
  },

  getCartProperties(configId) {
    return this.getSummaryProperties(configId);
  },

  async addConfiguredProductToCart() {
    const addToCartButton = document.getElementById("addToCart");

    if (!addToCartButton) {
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

      const usedCustomEmojiIcons = this.getUsedCustomEmojiIcons();

      if (usedCustomEmojiIcons.length) {
        window.showCartStatus(
          "Step 1/3",
          "Uploading custom emoji files...",
          false,
        );

        await this.uploadUsedCustomEmojis(configId);
      }

      window.showCartStatus(
        usedCustomEmojiIcons.length ? "Step 2/3" : "Step 1/2",
        "Uploading shoelace PDF...",
        false,
      );

      const pdfBytes = await this.generatePDF();
      const upload = await this.uploadPDF(pdfBytes, configId);
      const cartProperties = {
        ...this.getCartProperties(configId),
        _pdfUrl: upload.secureUrl,
      };

      window.showCartStatus(
        usedCustomEmojiIcons.length ? "Step 3/3" : "Step 2/2",
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

    } catch (error) {
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
      "Main Color": this.getMainColorSummary(),
      "Aglet Style": this.getAgletStyleSummary(),
      "Aglet Color": this.getAgletColorSummary(),

      "Front Text": this.frontTextValue || "N/a",
      "Front Text Color": this.getTextColorSummary("front"),
      "Front Emoji Color": this.getEmojiColorSummary("front"),

      "Back Text": this.backTextValue || "N/a",
      "Back Text Color": this.getTextColorSummary("back"),
      "Back Emoji Color": this.getEmojiColorSummary("back"),
      // _customEmojiUrls: JSON.stringify(
      //   Object.fromEntries(this.getCustomEmojiUploadEntries()),
      // ),
    };
  },

  openSummaryModal() {
    const modal = document.getElementById("summaryModal");
    const table = document.getElementById("summaryTable");

    if (!modal || !table) {
      return;
    }

    const properties = this.getSummaryProperties();

    table.innerHTML = Object.entries(properties)
      .map(([label, value]) => {
        const displayValue =
          label === "Custom Emoji Files"
            ? value
            : this.formatEmojiMarkers(value);
        return `
        <div class="summary-row">
          <span class="summary-label">${this.escapeHTML(label)}</span>
          <span class="summary-value">${this.escapeHTML(displayValue)}</span>
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
    const directionalTooltip = document.querySelector(
      ".directional-button .directional-tooltip",
    );
    const textInput = document.getElementById("shoelace-text");
    const backTextInput = document.getElementById("shoelace-text-back");
    const emojiButtons = document.querySelectorAll(".emoji-btn");
    const summaryBackBtn = document.getElementById("summaryBackButton");
    const shoeColorButtons = document.querySelectorAll("[data-shoe-color]");
    const previewBtn = document.getElementById("previewShoeBtn");
    const pdfBtn = document.getElementById("pdfBtn");
    const addToCartBtn = document.getElementById("addToCart");
    const summaryBtn = document.getElementById("summaryBtn");
    const closeSummaryBtn = document.getElementById("closeSummary");
    const summaryModal = document.getElementById("summaryModal");
    const summaryOverlay = document.querySelector(".summary-overlay");
    const agletStyleButtons = document.querySelectorAll(".aglet-style-btn");
    const shoelaceModelSliders = document.querySelectorAll(
      "[data-shoelace-model-slider]",
    );
    const shoelaceTextSliders = document.querySelectorAll(
      "[data-shoelace-text-slider]",
    );
    const shoelaceMeshSliders = document.querySelectorAll(
      "[data-shoelace-mesh-slider]",
    );
    const agletMeshSliders = document.querySelectorAll(
      "[data-aglet-mesh-slider]",
    );

    this.setupCustomEmojiUpload();
    const duplicateShoelaceTextSliders = document.querySelectorAll(
      "[data-duplicate-shoelace-text-slider]",
    );

    shoelaceModelSliders.forEach((slider) => {
      const key = slider.dataset.shoelaceModelSlider;
      const valueLabel = document.querySelector(
        `[data-shoelace-model-value="${key}"]`,
      );

      if (!key || !(key in this.shoelaceModelTransform)) return;

      slider.value = this.shoelaceModelTransform[key];

      if (valueLabel) {
        valueLabel.textContent = slider.value;
      }

      slider.addEventListener("input", (event) => {
        this.shoelaceModelTransform[key] = Number(event.target.value || 0);

        if (valueLabel) {
          valueLabel.textContent = event.target.value;
        }

        this.applyShoelaceModelTransform(true);
      });
    });

    shoelaceTextSliders.forEach((slider) => {
      const key = slider.dataset.shoelaceTextSlider;
      const valueLabel = document.querySelector(
        `[data-shoelace-text-value="${key}"]`,
      );

      if (!key || !(key in this.shoelaceTextTransform)) return;

      slider.value = this.shoelaceTextTransform[key];

      if (valueLabel) {
        valueLabel.textContent = slider.value;
      }

      slider.addEventListener("input", (event) => {
        this.shoelaceTextTransform[key] = Number(event.target.value || 0);

        if (valueLabel) {
          valueLabel.textContent = event.target.value;
        }

        ShoelaceText.updateShoelaceText(
          this,
          this.frontTextValue || "",
          "front",
        );
        ShoelaceText.updateShoelaceText(this, this.backTextValue || "", "back");
      });
    });

    shoelaceMeshSliders.forEach((slider) => {
      const meshName = slider.dataset.shoelaceMesh;
      const key = slider.dataset.shoelaceMeshSlider;
      const transform = this.shoelaceMeshTransforms[meshName];
      const valueLabel = document.querySelector(
        `[data-shoelace-mesh-value="${meshName}.${key}"]`,
      );

      if (!transform || !key || !(key in transform)) return;

      slider.value = transform[key];

      if (valueLabel) {
        valueLabel.textContent = slider.value;
      }

      slider.addEventListener("input", (event) => {
        transform[key] = Number(event.target.value || 0);

        if (valueLabel) {
          valueLabel.textContent = event.target.value;
        }

        this.applyShoelaceMeshTransforms(true);
      });
    });

    agletMeshSliders.forEach((slider) => {
      const meshName = slider.dataset.agletMesh;
      const key = slider.dataset.agletMeshSlider;
      const transform = this.agletMeshTransforms[meshName];
      const valueLabel = document.querySelector(
        `[data-aglet-mesh-value="${meshName}.${key}"]`,
      );

      if (!transform || !key || !(key in transform)) return;

      slider.value = transform[key];

      if (valueLabel) {
        valueLabel.textContent = slider.value;
      }

      slider.addEventListener("input", (event) => {
        transform[key] = Number(event.target.value || 0);

        if (valueLabel) {
          valueLabel.textContent = event.target.value;
        }

        this.applyAgletMeshTransforms();
      });
    });

    duplicateShoelaceTextSliders.forEach((slider) => {
      const meshName = slider.dataset.duplicateShoelaceText;
      const key = slider.dataset.duplicateShoelaceTextSlider;
      const transform = this.duplicateShoelaceTextTransforms[meshName];
      const valueLabel = document.querySelector(
        `[data-duplicate-shoelace-text-value="${meshName}.${key}"]`,
      );

      if (!transform || !key || !(key in transform)) return;

      slider.value = transform[key];

      if (valueLabel) {
        valueLabel.textContent = slider.value;
      }

      slider.addEventListener("input", (event) => {
        transform[key] = Number(event.target.value || 0);

        if (valueLabel) {
          valueLabel.textContent = event.target.value;
        }

        ShoelaceText.updateShoelaceText(
          this,
          this.frontTextValue || "",
          "front",
        );
        ShoelaceText.updateShoelaceText(this, this.backTextValue || "", "back");
      });
    });

    if (textInput) {
      textInput.addEventListener("focus", () => {
        this.activeTextSide = "front";
        this.clearCustomEmojiFeedback();
        this.goToFrontView();
      });

      textInput.addEventListener("input", (event) => {
        this.activeTextSide = "front";
        this.clearCustomEmojiFeedback();
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
        this.clearCustomEmojiFeedback();
        this.goToBackView();
      });

      backTextInput.addEventListener("input", (event) => {
        this.activeTextSide = "back";
        this.clearCustomEmojiFeedback();
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

    if (summaryBackBtn) {
      summaryBackBtn.addEventListener("click", () => {
        this.backShoe();
      });
    }

    shoeColorButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const color = button.dataset.shoeColor;

        if (!color) return;

        shoeColorButtons.forEach((item) => {
          item.classList.toggle("active", item === button);
        });

        this.applyJordanShoeColor(color);
      });
    });

    agletStyleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const style = button.dataset.agletStyle || "default";

        agletStyleButtons.forEach((item) => {
          item.classList.remove("btn-dark", "btn-active", "active");
          item.classList.add("btn-outline-dark");
        });

        button.classList.remove("btn-outline-dark");
        button.classList.add("btn-dark", "btn-active", "active");

        this.applyAgletStyle(style);
      });
    });

    if (directionalButton) {
      directionalButton.addEventListener("click", () => {
        this.toggleBackCameraView();
      });
    }

    if (directionalTooltip) {
      this.directionalTooltip = directionalTooltip;
      this.updateDirectionalTooltip();
    }

    if (previewBtn) {
      previewBtn.addEventListener("click", () => {
        this.positionShoe();
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
        this.insertIconIntoActiveInput(btn.dataset.icon);
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

  disableImageDragging() {
    const wrapper = document.querySelector(".shoelaces-configurator-wrapper");
    if (!wrapper) return;

    wrapper.querySelectorAll("img").forEach((image) => {
      image.draggable = false;
    });

    wrapper.addEventListener("dragstart", (event) => {
      if (event.target?.tagName?.toLowerCase() === "img") {
        event.preventDefault();
      }
    });
  },

  applyShoelaceModelTransform(refreshText = true) {
    if (!this.model) return;

    this.model.position.set(
      Number(this.shoelaceModelTransform.x || 0),
      Number(this.shoelaceModelTransform.y || 0),
      Number(this.shoelaceModelTransform.z || 0),
    );
    this.model.rotation.set(
      THREE.MathUtils.degToRad(
        Number(this.shoelaceModelTransform.rotationX || 0),
      ),
      THREE.MathUtils.degToRad(
        Number(this.shoelaceModelTransform.rotationY || 0),
      ),
      THREE.MathUtils.degToRad(
        Number(this.shoelaceModelTransform.rotationZ || 0),
      ),
    );
    this.model.updateMatrixWorld(true);

    if (!refreshText || !window.ShoelaceText) return;

    ShoelaceText.updateShoelaceText(this, this.frontTextValue || "", "front");
    ShoelaceText.updateShoelaceText(this, this.backTextValue || "", "back");
  },

  getShoelaceMeshTransform(name, includePreview = this.isShoePreviewActive) {
    const transform = this.shoelaceMeshTransforms[name] || {};
    const previewTransform = includePreview
      ? this.shoelacePreviewMeshTransforms[name] || {}
      : {};

    return {
      x: Number(transform.x || 0) + Number(previewTransform.x || 0),
      y: Number(transform.y || 0) + Number(previewTransform.y || 0),
      z: Number(transform.z || 0) + Number(previewTransform.z || 0),
      rotationX:
        Number(transform.rotationX || 0) +
        Number(previewTransform.rotationX || 0),
      rotationY:
        Number(transform.rotationY || 0) +
        Number(previewTransform.rotationY || 0),
      rotationZ:
        Number(transform.rotationZ || 0) +
        Number(previewTransform.rotationZ || 0),
    };
  },

  applyShoelaceMeshTransforms(
    refreshText = true,
    includePreview = this.isShoePreviewActive,
  ) {
    Object.entries(this.shoelacePivotGroups).forEach(([name, group]) => {
      const transform = this.getShoelaceMeshTransform(name, includePreview);

      if (!group || !transform) return;

      const base = group.userData.baseShoelaceTransform;
      if (!base) return;

      group.position.set(
        base.position.x + Number(transform.x || 0),
        base.position.y + Number(transform.y || 0),
        base.position.z + Number(transform.z || 0),
      );
      group.rotation.set(
        base.rotation.x +
        THREE.MathUtils.degToRad(Number(transform.rotationX || 0)),
        base.rotation.y +
        THREE.MathUtils.degToRad(Number(transform.rotationY || 0)),
        base.rotation.z +
        THREE.MathUtils.degToRad(Number(transform.rotationZ || 0)),
      );
      group.updateMatrixWorld(true);
    });

    if (!refreshText || !window.ShoelaceText) return;

    ShoelaceText.updateShoelaceText(this, this.frontTextValue || "", "front");
    ShoelaceText.updateShoelaceText(this, this.backTextValue || "", "back");
  },

  setPreviewTextVisibility(visible) {
    [...this.frontPreviewTextMeshes, ...this.backPreviewTextMeshes].forEach(
      (mesh) => {
        mesh.visible = visible;
      },
    );
  },

  getEditableShoelaceKey(name) {
    const baseName = String(name || "")
      .toLowerCase()
      .replace(/\.\d+$/, "");

    if (baseName === "shoelaces_1") return "shoelace_1";
    if (baseName === "shoelaces_2") return "shoelace_2";
    if (baseName === "shoelaces_3") return "shoelace_3";
    if (baseName === "shoelaces_4") return "shoelace_4";

    return baseName;
  },

  getShoelacePlacementKey(name) {
    const rawName = String(name || "").toLowerCase();
    const baseName = String(name || "")
      .toLowerCase()
      .replace(/\.\d+$/, "");

    if (baseName === "shoelace_1" || baseName === "shoelaces_1") {
      return "shoelace_1";
    }

    if (baseName === "shoelace_2" || baseName === "shoelaces_2") {
      return "shoelace_2";
    }

    if (baseName === "aglet_1") return "shoelace_1";
    if (baseName === "aglet_2") return "shoelace_2";
    if (
      rawName === "cylinder" ||
      rawName === "cylinder.002" ||
      rawName === "plane" ||
      rawName === "sphere"
    ) {
      return "shoelace_1";
    }

    if (
      rawName === "cylinder.001" ||
      rawName === "cylinder.004" ||
      rawName === "plane.001" ||
      rawName === "sphere.001"
    ) {
      return "shoelace_2";
    }

    if (baseName === "shoelace_3" || baseName === "shoelaces_3") {
      return "shoelace_3";
    }

    if (baseName === "shoelace_4" || baseName === "shoelaces_4") {
      return "shoelace_4";
    }

    if (baseName === "aglet_3") return "shoelace_3";
    if (baseName === "aglet_4") return "shoelace_4";

    return "";
  },

  getAgletPlacementKey(node) {
    let current = node;

    while (current) {
      const normalizedName = this.normalizeAgletName(current.name);
      const agletNumberMatch = normalizedName.match(
        /^(flat|default|classic|bullet|aglet)[_-]([1-4])$/,
      );

      if (agletNumberMatch) {
        return `shoelace_${agletNumberMatch[2]}`;
      }

      const placementKey = this.getShoelacePlacementKey(current.name);

      if (placementKey) return placementKey;

      current = current.parent;
    }

    return "";
  },

  getAgletTransformKey(node) {
    const placementKey =
      node?.userData?.shoelacePlacementKey || this.getAgletPlacementKey(node);
    const agletNumberMatch = String(placementKey || "").match(/shoelace_([1-4])/);

    return agletNumberMatch ? `aglet_${agletNumberMatch[1]}` : "";
  },

  storeAgletBaseTransform(mesh) {
    if (!mesh?.isMesh) return;

    mesh.userData.baseAgletTransform = {
      position: mesh.position.clone(),
      rotation: mesh.rotation.clone(),
    };
  },

  attachAgletsToShoelacePivots() {
    if (!this.model) return;

    this.model.updateMatrixWorld(true);

    this.agletMeshes.forEach((mesh) => {
      if (!mesh?.isMesh || mesh.userData.agletPivoted) return;

      const placementKey = this.getAgletPlacementKey(mesh);
      const lacePivot = this.shoelacePivotGroups[placementKey];

      if (!placementKey || !lacePivot) return;

      lacePivot.attach(mesh);
      mesh.userData.agletPivoted = true;
      mesh.userData.shoelacePlacementKey = placementKey;
      this.storeAgletBaseTransform(mesh);
    });

    this.applyAgletMeshTransforms();
    this.model.updateMatrixWorld(true);
  },

  applyAgletMeshTransforms() {
    this.agletMeshes.forEach((mesh) => {
      if (!mesh?.isMesh) return;

      if (!mesh.userData.baseAgletTransform) {
        this.storeAgletBaseTransform(mesh);
      }

      const transformKey = this.getAgletTransformKey(mesh);
      const transform = this.isShoePreviewActive
        ? this.agletMeshTransforms[transformKey] || {}
        : {};
      const base = mesh.userData.baseAgletTransform;

      if (!base) return;

      mesh.position.set(
        base.position.x + Number(transform.x || 0),
        base.position.y + Number(transform.y || 0),
        base.position.z + Number(transform.z || 0),
      );
      mesh.rotation.set(
        base.rotation.x +
        THREE.MathUtils.degToRad(Number(transform.rotationX || 0)),
        base.rotation.y +
        THREE.MathUtils.degToRad(Number(transform.rotationY || 0)),
        base.rotation.z +
        THREE.MathUtils.degToRad(Number(transform.rotationZ || 0)),
      );
      mesh.updateMatrixWorld(true);
    });
  },

  getShoelaceTextTransformForLace(laceMesh) {
    const name = this.getEditableShoelaceKey(laceMesh?.name);

    return (
      this.duplicateShoelaceTextTransforms[name] || this.shoelaceTextTransform
    );
  },

  createShoelacePivotGroups() {
    if (!this.model) return;

    this.model.updateMatrixWorld(true);

    Object.entries(this.shoelaceParts).forEach(([name, parts]) => {
      if (!parts?.length || this.shoelacePivotGroups[name]) return;

      const box = new THREE.Box3();
      parts.forEach((part) => {
        part.updateWorldMatrix(true, false);
        box.expandByObject(part);
      });

      if (box.isEmpty()) return;

      const worldCenter = box.getCenter(new THREE.Vector3());
      const localCenter = this.model.worldToLocal(worldCenter.clone());
      const pivot = new THREE.Group();

      pivot.name = `${name}_placement_pivot`;
      pivot.position.copy(localCenter);

      this.model.add(pivot);
      pivot.updateWorldMatrix(true, false);

      parts.forEach((part) => {
        pivot.attach(part);
      });

      pivot.userData.baseShoelaceTransform = {
        position: pivot.position.clone(),
        rotation: pivot.rotation.clone(),
      };

      this.shoelacePivotGroups[name] = pivot;
    });

    this.model.updateMatrixWorld(true);
  },

  clonePreviewShoelaceMaterial(material, forcePlainColor = false) {
    if (!material) return material;

    if (Array.isArray(material)) {
      return material.map((item) =>
        this.clonePreviewShoelaceMaterial(item, forcePlainColor),
      );
    }

    const clone = material.clone ? material.clone() : material;

    if (forcePlainColor && clone) {
      clone.map = null;
      clone.normalMap = null;
      clone.aoMap = null;
      clone.metalnessMap = null;
      clone.roughnessMap = null;
      clone.alphaMap = null;
      clone.needsUpdate = true;
    }

    return clone;
  },

  cleanupPreviewDuplicateShoelaces() {
    this.previewDuplicateShoelaces.forEach((mesh) => {
      mesh.parent?.remove(mesh);
      this.shoelaces = this.shoelaces.filter((item) => item !== mesh);
      this.agletMeshes = this.agletMeshes.filter((item) => item !== mesh);
      this.textTargetLaces = this.textTargetLaces.filter(
        (item) => item !== mesh,
      );
    });

    ["shoelace_3", "shoelace_4"].forEach((name) => {
      const group = this.shoelacePivotGroups[name];

      if (group?.parent) {
        group.parent.remove(group);
      }

      delete this.shoelacePivotGroups[name];
      this.shoelaceParts[name] = [];
    });

    this.previewDuplicateShoelaces = [];
    this.previewDuplicateTextTargetLaces = [];
  },

  createPreviewDuplicateShoelaces() {
    if (!this.model || !this.shoe) return;

    this.cleanupPreviewDuplicateShoelaces();
    this.model.updateMatrixWorld(true);
    this.shoe.updateMatrixWorld(true);

    const shoeBox = new THREE.Box3().setFromObject(this.shoe);
    if (shoeBox.isEmpty()) return;

    const shoeCenter = shoeBox.getCenter(new THREE.Vector3());
    const localMirrorCenter = this.model.worldToLocal(shoeCenter.clone());
    const clonePairs = [
      ["shoelace_1", "shoelace_3"],
      ["shoelace_2", "shoelace_4"],
    ];
    const clonedAglets = [];

    clonePairs.forEach(([sourceName, targetName]) => {
      const sourceGroup = this.shoelacePivotGroups[sourceName];

      if (!sourceGroup) return;

      const cloneGroup = sourceGroup.clone(true);
      const targetNumber = targetName.endsWith("_3") ? "3" : "4";

      cloneGroup.name = `${targetName}_placement_pivot`;
      cloneGroup.position.x =
        localMirrorCenter.x - (sourceGroup.position.x - localMirrorCenter.x);
      cloneGroup.scale.x *= -1;

      cloneGroup.traverse((child) => {
        if (!child.isMesh) return;

        child.castShadow = true;
        child.receiveShadow = true;

        const rawName = String(child.name || "").toLowerCase();

        if (rawName.includes("shoelace")) {
          child.material = this.clonePreviewShoelaceMaterial(child.material);
          child.name = `shoelace_${targetNumber}`;
          this.shoelaces.push(child);
          this.textTargetLaces.push(child);
          this.previewDuplicateShoelaces.push(child);
          this.previewDuplicateTextTargetLaces.push(child);
        } else {
          child.material = this.clonePreviewShoelaceMaterial(child.material);

          child.userData.keepOriginalAgletMaterial = true;

          child.userData.agletStyle =
            child.userData.agletStyle ||
            this.getAgletStyleFromNode(child) ||
            this.activeAgletStyle ||
            "default";

          child.name = `${child.userData.agletStyle}_${targetNumber}`;
          child.userData.shoelacePlacementKey = targetName;

          this.storeAgletBaseTransform(child);

          this.agletMeshes.push(child);
          clonedAglets.push(child);
        }

        this.shoelaceParts[targetName].push(child);
      });

      this.model.add(cloneGroup);
      cloneGroup.userData.baseShoelaceTransform = {
        position: cloneGroup.position.clone(),
        rotation: cloneGroup.rotation.clone(),
      };
      this.shoelacePivotGroups[targetName] = cloneGroup;
    });

    this.previewDuplicateShoelaces.push(...clonedAglets);
    this.applyAgletMeshTransforms();
    this.model.updateMatrixWorld(true);
  },

  getEditableShoelaces() {
    return this.shoelaces.filter((mesh) => {
      const name = this.getEditableShoelaceKey(mesh.name);

      return (
        name === "shoelace_1" ||
        name === "shoelace_2" ||
        name === "shoelace_3" ||
        name === "shoelace_4"
      );
    });
  },

  getShoePreviewLaces() {
    if (!this.shoe) return [];

    const laces = [];

    this.shoe.traverse((child) => {
      if (!child.isMesh) return;

      const rawName = String(child.name || "").toLowerCase();
      const parentName = String(child.parent?.name || "").toLowerCase();

      if (
        rawName === "object_40.001" ||
        rawName === "object_40.002" ||
        parentName === "shoelace_18.001"
      ) {
        laces.push(child);
      }
    });

    return laces;
  },

  setShoePreviewLaceVisibility(visible) {
    this.getShoePreviewLaces().forEach((lace) => {
      lace.visible = visible;
    });
  },

  captureShoelacePreviewState() {
    if (!this.model || this.shoelacePreviewState) return;

    this.shoelacePreviewState = {
      position: this.model.position.clone(),
      rotation: this.model.rotation.clone(),
      scale: this.model.scale.clone(),
    };
  },

  restoreShoelacePreviewState() {
    if (!this.model || !this.shoelacePreviewState) return;

    this.model.position.copy(this.shoelacePreviewState.position);
    this.model.rotation.copy(this.shoelacePreviewState.rotation);
    this.model.scale.copy(this.shoelacePreviewState.scale);
    this.model.updateMatrixWorld(true);
    this.shoelacePreviewState = null;
  },

  moveShoelacesToShoePreview() {
    if (!this.model || !this.shoe) return;

    this.captureShoelacePreviewState();
    this.restoreShoelacePreviewState();
    this.captureShoelacePreviewState();

    this.shoe.updateMatrixWorld(true);
    this.model.updateMatrixWorld(true);

    const sourceMeshes = this.getEditableShoelaces();
    const targetMeshes = this.getShoePreviewLaces();

    if (!sourceMeshes.length) return;

    const sourceBox = new THREE.Box3();
    const targetBox = new THREE.Box3();

    sourceMeshes.forEach((mesh) => sourceBox.expandByObject(mesh));

    if (targetMeshes.length) {
      targetMeshes.forEach((mesh) => targetBox.expandByObject(mesh));
    } else {
      targetBox.setFromObject(this.shoe);
    }

    if (sourceBox.isEmpty() || targetBox.isEmpty()) return;

    const sourceCenter = sourceBox.getCenter(new THREE.Vector3());
    const targetCenter = targetBox.getCenter(new THREE.Vector3());
    const delta = targetCenter.sub(sourceCenter);

    this.model.position.add(delta);
    this.model.updateMatrixWorld(true);
  },

  showPreviewOptionsPanel() {
    const product = document.getElementById("productOptionsAccordion");
    const summary = document.getElementById("summaryOptionsAccordion");

    if (!product || !summary) return;

    product.classList.add("fade-out");

    setTimeout(() => {
      product.classList.add("hidden");
      product.classList.remove("fade-out");

      summary.classList.remove("hidden");

      requestAnimationFrame(() => {
        summary.classList.remove("fade-out");
      });
    }, 600);
  },

  showProductOptionsPanel() {
    const product = document.getElementById("productOptionsAccordion");
    const summary = document.getElementById("summaryOptionsAccordion");

    if (!product || !summary) return;

    summary.classList.add("fade-out");

    setTimeout(() => {
      summary.classList.add("hidden");

      product.classList.remove("hidden");

      requestAnimationFrame(() => {
        product.classList.remove("fade-out");
      });
    }, 600);
  },

  positionShoe() {
    if (!this.shoe) return;

    const wrapper = document.querySelector(".shoelaces-configurator-wrapper");
    const iconContainer = document.querySelector(".icon-container");

    wrapper?.classList.add("preview-mode");
    iconContainer?.classList.add("d-none");
    this.isShoePreviewActive = true;
    this.setPreviewLighting();
    this.showPreviewOptionsPanel();

    this.renderer.shadowMap.enabled = true;

    if (this.dirLight) {
      this.dirLight.castShadow = true;
      this.dirLight.shadow.needsUpdate = true;
    }

    if (this.floor) {
      this.floor.visible = true;
      this.floor.receiveShadow = true;
    }

    if (this.shoe) {
      this.shoe.updateMatrixWorld(true);

      if (window.applyShoePreviewLaceColor) {
        window.applyShoePreviewLaceColor(this.shoe, this.activeModelColorHex);
      }

      this.applyJordanShoeColor(this.activeShoeColor);

      ShoelaceText.updateShoelaceText(this, this.frontTextValue || "", "front");
      ShoelaceText.updateShoelaceText(this, this.backTextValue || "", "back");

      this.shoe.visible = true;
      this.shoe.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }

    this.moveShoelacesToShoePreview();
    this.setShoePreviewLaceVisibility(true);
    this.applyShoelaceMeshTransforms(false, true);
    this.createPreviewDuplicateShoelaces();
    this.applyAgletStyle(this.activeAgletStyle);
    this.applyAgletColor(this.activeAgletColor, this.activeAgletColorName);
    this.applyAgletMeshTransforms();
    this.applyShoelaceMeshTransforms(false, true);

    this.shoelaces.forEach((lace) => {
      lace.visible = true;
      lace.castShadow = true;
      lace.receiveShadow = true;
    });

    ShoelaceText.updateShoelaceText(this, this.frontTextValue || "", "front");
    ShoelaceText.updateShoelaceText(this, this.backTextValue || "", "back");

    this.setPreviewTextVisibility(true);

    const box = new THREE.Box3().setFromObject(this.shoe);
    const center = box.getCenter(new THREE.Vector3());

    this.cameraStates.preview = {
      position: center.clone().add(new THREE.Vector3(-10, 6, 8)),
      target: center.clone(),
    };

    this.unlockCameraDragLimits();

    this.goToCameraState("preview", () => {
      this.unlockCameraDragLimits();
    });
  },

  backShoe() {
    const wrapper = document.querySelector(".shoelaces-configurator-wrapper");
    const iconContainer = document.querySelector(".icon-container");

    wrapper?.classList.remove("preview-mode");
    iconContainer?.classList.remove("d-none");
    this.isShoePreviewActive = false;
    this.isBackView = false;
    this.activeTextSide = "front";
    this.showProductOptionsPanel();
    this.setPreviewTextVisibility(false);
    this.restoreConfiguratorLighting();
    this.restoreShoelacePreviewState();
    this.setShoePreviewLaceVisibility(true);
    this.cleanupPreviewDuplicateShoelaces();
    this.applyShoelaceMeshTransforms(false, false);
    this.applyAgletMeshTransforms();

    ShoelaceText.updateShoelaceText(this, this.frontTextValue || "", "front");
    ShoelaceText.updateShoelaceText(this, this.backTextValue || "", "back");

    this.goToCameraState("default", () => {
      this.setCameraDragLimits("front");
      this.updateTextInputAvailability();
    });

    this.renderer.shadowMap.enabled = true;

    if (this.dirLight) {
      this.dirLight.castShadow = true;
      this.dirLight.shadow.needsUpdate = true;
    }

    if (this.floor) {
      this.floor.visible = true;
      this.floor.receiveShadow = true;
    }

    this.shoelaces.forEach((lace) => {
      lace.visible = true;
      lace.castShadow = true;
      lace.receiveShadow = true;
    });

    if (this.shoe) {
      this.shoe.visible = false;
    }

    this.updateTextInputAvailability();
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
      btn.style.right = isMobile ? "" : this.viewport_width + 20 + "px";
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
  ShoelaceApp.init();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}
