window.ShoelaceText = {
  loadTextFont(app) {
    const loader = app.fontLoader || new window.FontLoader();

    loader.load(
      "https://cdn.shopify.com/s/files/1/0671/0086/8674/files/helve.json?v=1773685789",
      (font) => {
        app.font = font;
        this.updateShoelaceText(app, "", "front");
        this.updateShoelaceText(app, "", "back");
      },
      undefined,
      (error) => {
        console.error("Failed to load font:", error);
      },
    );
  },

  splitTextAndIcons(app, text) {
    const parts = [];
    const icons = Object.values(app.iconRegistry);

    if (!icons.length) {
      return [{ type: "text", value: text }];
    }

    const markerToIcon = {};

    icons.forEach((icon) => {
      markerToIcon[icon.marker] = icon.name;
    });

    const escapeRegExp = (value) => {
      return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const markerPattern = icons
      .map((icon) => escapeRegExp(icon.marker))
      .join("|");
    const tokens = text.split(new RegExp(`(${markerPattern})`, "g"));

    tokens.forEach((token) => {
      if (!token) return;

      if (markerToIcon[token]) {
        parts.push({
          type: "icon",
          value: markerToIcon[token],
        });
      } else {
        const words = token.split(/(\s+)/);

        words.forEach((word) => {
          if (!word) return;

          if (/^\s+$/.test(word)) {
            parts.push({ type: "space", value: word });
          } else {
            parts.push({ type: "text", value: word });
          }
        });
      }
    });

    return parts;
  },

  getTextMaxWidth(app) {
    return Number(app.textFieldMaxWidth || 5);
  },

  getTextDesignWidth(app, text) {
    if (!text) return 0;

    const parts = this.splitTextAndIcons(app, text);
    let width = 0;

    for (const part of parts) {
      if (part.type === "space") {
        width += 0.08 * part.value.length;
      }

      if (part.type === "text") {
        if (!app.font) {
          width += 0.12 * part.value.length;
          continue;
        }

        const geometry = new window.TextGeometry(part.value, {
          font: app.font,
          size: 0.2,
          height: 0.01,
          curveSegments: 12,
        });

        geometry.computeBoundingBox();

        const box = geometry.boundingBox;
        width += box.max.x - box.min.x + 0.03;
        geometry.dispose();
      }

      if (part.type === "icon") {
        const icon = app.iconRegistry[part.value];
        width += icon ? icon.width : 0.3;
      }
    }

    return width;
  },

  isTextWithinMaxWidth(app, text) {
    return this.getTextDesignWidth(app, text) <= this.getTextMaxWidth(app);
  },

  clampTextToMaxWidth(app, text) {
    let value = text || "";

    while (value && !this.isTextWithinMaxWidth(app, value)) {
      value = value.slice(0, -1);
    }

    return value;
  },

  async updateShoelaceText(app, text, side = "front") {
    const textColor = side === "front" ? app.frontTextColor : app.backTextColor;

    const emojiColor =
      side === "front" ? app.frontEmojiColor : app.backEmojiColor;

    if (side === "front") {
      app.frontTextValue = text;
    } else {
      app.backTextValue = text;
    }

    if (!app.font || !app.textTargetLaces.length) return;

    const meshListName =
      side === "front" ? "frontTextMeshes" : "backTextMeshes";

    app[meshListName].forEach((mesh) => {
      app.scene.remove(mesh);
    });

    app[meshListName] = [];

    if (!text.trim()) return;

    const parts = this.splitTextAndIcons(app, text);

    for (const lace of app.textTargetLaces) {
      const wrapper = new THREE.Group();
      const group = new THREE.Group();
      wrapper.add(group);

      let offsetX = 0;

      for (const part of parts) {
        if (part.type === "space") {
          offsetX += 0.08 * part.value.length;
        }

        if (part.type === "text") {
          const geometry = new window.TextGeometry(part.value, {
            font: app.font,
            size: 0.2,
            height: 0.01,
            curveSegments: 12,
          });

          geometry.computeBoundingBox();

          const box = geometry.boundingBox;
          const width = box.max.x - box.min.x;

          const mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({
              color: textColor || "#111111",
              roughness: 0.5,
              metalness: 0.1,
              depthTest: true,
              depthWrite: true,
            }),
          );

          mesh.userData.type = "text";
          mesh.userData.side = side;

          mesh.position.x = offsetX;
          group.add(mesh);

          offsetX += width + 0.03;
        }

        if (part.type === "icon") {
          const icon = app.iconRegistry[part.value];
          const mesh = await app.createIconMesh(part.value);

          if (!mesh || !icon) continue;

          mesh.userData.type = "emoji";
          mesh.userData.side = side;

          mesh.traverse((child) => {
            if (child.isMesh && child.material && child.material.color) {
              child.userData.type = "emoji";
              child.userData.side = side;
              child.material = child.material.clone();
              child.material.color.set(emojiColor || "#111111");
              child.material.needsUpdate = true;
            }
          });

          mesh.scale.set(icon.scale, icon.scale, icon.scale);

          mesh.position.x = offsetX + icon.width / 2 + icon.x;
          mesh.position.y = icon.y;
          mesh.position.z = icon.z;

          mesh.rotation.set(icon.rotationX, icon.rotationY, icon.rotationZ);

          group.add(mesh);

          offsetX += icon.width;
        }
      }

      group.position.x = -offsetX;

      app[meshListName].push(wrapper);

      this.shrinkwrapTextToLace(app, wrapper, lace, side);
    }
  },

  shrinkwrapTextToLace(app, textMesh, laceMesh, side = "front") {
    if (!textMesh || !laceMesh) return;

    app.scene.add(textMesh);

    const box = new THREE.Box3().setFromObject(laceMesh);

    const centerX = (box.min.x + box.max.x) / 2;
    const centerY = box.min.y + 0.5;
    const centerZ = (box.min.z + box.max.z) / 2;

    let rayOrigin;
    let rayDirection;

    if (side === "front") {
      // Front side ray
      rayOrigin = new THREE.Vector3(centerX, centerY, centerZ + 5);
      rayDirection = new THREE.Vector3(0, 0, -1);
    } else {
      // Back side ray
      rayOrigin = new THREE.Vector3(centerX, centerY, centerZ - 5);
      rayDirection = new THREE.Vector3(0, 0, 1);
    }

    const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);
    const hits = raycaster.intersectObject(laceMesh, true);

    if (!hits.length) {
      textMesh.position.copy(laceMesh.position);

      if (side === "front") {
        textMesh.position.z += 0.05;
        textMesh.rotation.set(0, 0, -Math.PI / 2);
      } else {
        textMesh.position.z -= 0.05;
        textMesh.rotation.set(0, Math.PI, -Math.PI / 2);
      }

      return;
    }

    const hit = hits[0];

    textMesh.position.copy(hit.point);

    if (side === "front") {
      textMesh.position.add(hit.face.normal.clone().multiplyScalar(-0.05));
      textMesh.position.x += -0.05;
      textMesh.rotation.set(0, 0, -Math.PI / 2);
    } else {
      textMesh.position.add(hit.face.normal.clone().multiplyScalar(0.05));
      textMesh.position.x += 0.15;

      // Flip text so it faces the back camera
      textMesh.rotation.set(0, Math.PI, -Math.PI / 2);
    }
  },
};
