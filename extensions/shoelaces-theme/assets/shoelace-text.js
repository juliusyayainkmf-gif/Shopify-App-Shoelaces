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

    if (!app.font) return;

    const meshListName =
      side === "front" ? "frontTextMeshes" : "backTextMeshes";
    const clearMeshes = (listName) => {
      if (!app[listName]) app[listName] = [];

      app[listName].forEach((mesh) => {
        app.scene.remove(mesh);
      });

      app[listName] = [];
    };

    clearMeshes(meshListName);
    clearMeshes(
      side === "front" ? "frontPreviewTextMeshes" : "backPreviewTextMeshes",
    );

    if (!text.trim()) return;

    const parts = this.splitTextAndIcons(app, text);

    const renderOnLaces = async (
      laces,
      listName,
      visible,
      useTextControls,
    ) => {
      if (!laces?.length) return;

      for (const lace of laces) {
        const wrapper = new THREE.Group();
        const group = new THREE.Group();
        wrapper.add(group);
        wrapper.visible = visible;

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

        app[listName].push(wrapper);

        this.shrinkwrapTextToLace(
          app,
          wrapper,
          lace,
          side,
          useTextControls,
        );
        wrapper.visible = visible;
      }
    };

    await renderOnLaces(app.textTargetLaces, meshListName, true, true);
  },

  shrinkwrapTextToLace(
    app,
    textMesh,
    laceMesh,
    side = "front",
    useTextControls = true,
  ) {
    if (!textMesh || !laceMesh) return;

    const laceName = app.getEditableShoelaceKey?.(laceMesh.name) || "";
    const isDuplicateLace =
      laceName === "shoelace_3" || laceName === "shoelace_4";
    const placementSide = isDuplicateLace
      ? side === "front"
        ? "front"
        : "back"
      : side === "front"
        ? "back"
        : "front";

    laceMesh.updateWorldMatrix(true, false);
    app.scene.add(textMesh);

    const worldQuaternion = laceMesh.getWorldQuaternion(
      new THREE.Quaternion(),
    );
    const localCenter = new THREE.Vector3();
    let localBox = null;

    if (laceMesh.geometry) {
      if (!laceMesh.geometry.boundingBox) {
        laceMesh.geometry.computeBoundingBox();
      }

      localBox = laceMesh.geometry.boundingBox;
      localBox.getCenter(localCenter);
      localCenter.y = localBox.min.y + 0.5;
    } else {
      new THREE.Box3().setFromObject(laceMesh).getCenter(localCenter);
      laceMesh.worldToLocal(localCenter);
    }

    const center = laceMesh.localToWorld(localCenter.clone());
    const laceAcross = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(worldQuaternion)
      .normalize();
    const laceUp = new THREE.Vector3(0, 1, 0)
      .applyQuaternion(worldQuaternion)
      .normalize();
    const frontNormal = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(worldQuaternion)
      .normalize();

    let rayOrigin;
    let rayDirection;
    let surfaceNormal;

    if (placementSide === "front") {
      surfaceNormal = frontNormal;
    } else {
      surfaceNormal = frontNormal.clone().negate();
    }

    rayOrigin = center.clone().add(surfaceNormal.clone().multiplyScalar(5));
    rayDirection = surfaceNormal.clone().negate();

    const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);
    const hits = raycaster.intersectObject(laceMesh, true);
    const laceTextOffset = placementSide === "front" ? -0.25 : -0.15;
    const textTransform =
      app.getShoelaceTextTransformForLace?.(laceMesh) ||
      app.shoelaceTextTransform ||
      {};
    const applyTextTransform = () => {
      if (side === "front") {
        textMesh.quaternion.copy(worldQuaternion);
        textMesh.rotateZ(-Math.PI / 2);
      } else {
        textMesh.quaternion.copy(worldQuaternion);
        textMesh.rotateY(Math.PI);
        textMesh.rotateZ(-Math.PI / 2);
      }

      if (!useTextControls) return;

      const depthOffset = Number(textTransform.z || 0);
      const depthDirection =
        depthOffset < 0 ? rayDirection.clone() : surfaceNormal.clone();
      const sideXOffset =
        side === "back"
          ? Number(textTransform.backX ?? textTransform.x ?? 0)
          : Number(textTransform.x || 0);

      textMesh.position
        .add(laceAcross.clone().multiplyScalar(sideXOffset))
        .add(laceUp.clone().multiplyScalar(Number(textTransform.y || 0)))
        .add(depthDirection.multiplyScalar(Math.abs(depthOffset)));

      textMesh.rotateX(
        THREE.MathUtils.degToRad(Number(textTransform.rotationX || 0)),
      );
      textMesh.rotateY(
        THREE.MathUtils.degToRad(Number(textTransform.rotationY || 0)),
      );
      textMesh.rotateZ(
        THREE.MathUtils.degToRad(Number(textTransform.rotationZ || 0)),
      );
    };

    if (!hits.length) {
      textMesh.position.copy(center);
      textMesh.position
        .add(surfaceNormal.clone().multiplyScalar(0.002))
        .add(laceAcross.clone().multiplyScalar(laceTextOffset));

      applyTextTransform();

      return;
    }

    const hit = hits[0];

    textMesh.position.copy(hit.point);

    if (placementSide === "front") {
      textMesh.position
        .add(surfaceNormal.clone().multiplyScalar(0.002))
        .add(laceAcross.clone().multiplyScalar(laceTextOffset));
      applyTextTransform();
    } else {
      textMesh.position
        .add(surfaceNormal.clone().multiplyScalar(0.002))
        .add(laceAcross.clone().multiplyScalar(laceTextOffset));

      // Flip text so it faces the back camera
      applyTextTransform();
    }
  },
};
