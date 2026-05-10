import { useEffect } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import styles from "../styles/shoelaces-settings.module.css";

const SHOELACE_COLORS_METAOBJECT_TYPE = "shoelaces_colors";

const GET_SHOELACE_COLORS_DEFINITION = `#graphql
  query GetShoelaceColorsDefinition($type: String!) {
    metaobjectDefinitionByType(type: $type) {
      id
      name
      type
    }
  }
`;

const CREATE_SHOELACE_COLORS_DEFINITION = `#graphql
  mutation CreateShoelaceColorsDefinition($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition {
        id
        name
        type
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const GET_SHOELACE_COLOR_ENTRIES = `#graphql
  query GetShoelaceColorEntries($type: String!) {
    metaobjects(first: 100, type: $type) {
      nodes {
        id
        handle
        fields {
          key
          value
        }
      }
    }
  }
`;

const CREATE_SHOELACE_COLOR_ENTRY = `#graphql
  mutation CreateShoelaceColorEntry($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        id
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const UPDATE_SHOELACE_COLOR_ENTRY = `#graphql
  mutation UpdateShoelaceColorEntry($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        id
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const DELETE_SHOELACE_COLOR_ENTRY = `#graphql
  mutation DeleteShoelaceColorEntry($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId
      userErrors {
        field
        message
        code
      }
    }
  }
`;

function fieldValue(entry, key) {
  return entry.fields.find((field) => field.key === key)?.value || "";
}

function colorFromEntry(entry) {
  return {
    id: entry.id,
    handle: entry.handle,
    name: fieldValue(entry, "name"),
    hex: fieldValue(entry, "hex"),
  };
}

function normalizeHex(value) {
  const hex = String(value || "").trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error("Use a valid 6-digit hex color, like #ff0000.");
  }

  return hex.toLowerCase();
}

function normalizeName(value) {
  const name = String(value || "").trim();

  if (!name) {
    throw new Error("Color name is required.");
  }

  if (name.length > 80) {
    throw new Error("Color name must be 80 characters or fewer.");
  }

  return name;
}

function uniqueColorKey(value) {
  return String(value || "").trim().toLowerCase();
}

function colorHandle(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `shoelaces-color-${slug || "color"}-${Date.now()}`;
}

function userErrorMessage(errors) {
  return errors.map((error) => error.message).join(", ");
}

async function assertUniqueColor(admin, { id = "", name, hex }) {
  const colors = await getColors(admin);
  const normalizedName = uniqueColorKey(name);
  const normalizedHex = uniqueColorKey(hex);

  const duplicateName = colors.find(
    (color) => color.id !== id && uniqueColorKey(color.name) === normalizedName,
  );

  if (duplicateName) {
    throw new Error(`A color named "${name}" already exists.`);
  }

  const duplicateHex = colors.find(
    (color) => color.id !== id && uniqueColorKey(color.hex) === normalizedHex,
  );

  if (duplicateHex) {
    throw new Error(
      `${hex} is already used by "${duplicateHex.name}". Pick a unique color value.`,
    );
  }
}

async function ensureShoelaceColorsMetaobjectDefinition(admin) {
  const findResponse = await admin.graphql(GET_SHOELACE_COLORS_DEFINITION, {
    variables: {
      type: SHOELACE_COLORS_METAOBJECT_TYPE,
    },
  });

  const findData = await findResponse.json();
  const existingDefinition = findData.data.metaobjectDefinitionByType;

  if (existingDefinition) {
    return existingDefinition;
  }

  const createResponse = await admin.graphql(
    CREATE_SHOELACE_COLORS_DEFINITION,
    {
      variables: {
        definition: {
          name: "Shoelaces Colors",
          type: SHOELACE_COLORS_METAOBJECT_TYPE,
          fieldDefinitions: [
            {
              name: "name",
              key: "name",
              type: "single_line_text_field",
            },
            {
              name: "hex",
              key: "hex",
              type: "color",
            },
          ],
        },
      },
    },
  );

  const createData = await createResponse.json();
  const errors = createData.data.metaobjectDefinitionCreate.userErrors;

  if (errors.length) {
    throw new Error(userErrorMessage(errors));
  }

  return createData.data.metaobjectDefinitionCreate.metaobjectDefinition;
}

async function getColors(admin) {
  const response = await admin.graphql(GET_SHOELACE_COLOR_ENTRIES, {
    variables: {
      type: SHOELACE_COLORS_METAOBJECT_TYPE,
    },
  });

  const data = await response.json();
  const entries = data.data.metaobjects.nodes || [];

  return entries.map(colorFromEntry).sort((a, b) => a.name.localeCompare(b.name));
}

async function createColor(admin, formData) {
  const name = normalizeName(formData.get("name"));
  const hex = normalizeHex(formData.get("hex"));

  await assertUniqueColor(admin, { name, hex });

  const response = await admin.graphql(CREATE_SHOELACE_COLOR_ENTRY, {
    variables: {
      metaobject: {
        type: SHOELACE_COLORS_METAOBJECT_TYPE,
        handle: colorHandle(name),
        fields: [
          {
            key: "name",
            value: name,
          },
          {
            key: "hex",
            value: hex,
          },
        ],
      },
    },
  });

  const data = await response.json();
  const errors = data.data.metaobjectCreate.userErrors;

  if (errors.length) {
    throw new Error(userErrorMessage(errors));
  }
}

async function updateColor(admin, formData) {
  const id = String(formData.get("id") || "");
  const name = normalizeName(formData.get("name"));
  const hex = normalizeHex(formData.get("hex"));

  if (!id) {
    throw new Error("Color ID is required.");
  }

  await assertUniqueColor(admin, { id, name, hex });

  const response = await admin.graphql(UPDATE_SHOELACE_COLOR_ENTRY, {
    variables: {
      id,
      metaobject: {
        fields: [
          {
            key: "name",
            value: name,
          },
          {
            key: "hex",
            value: hex,
          },
        ],
      },
    },
  });

  const data = await response.json();
  const errors = data.data.metaobjectUpdate.userErrors;

  if (errors.length) {
    throw new Error(userErrorMessage(errors));
  }
}

async function deleteColor(admin, formData) {
  const id = String(formData.get("id") || "");

  if (!id) {
    throw new Error("Color ID is required.");
  }

  const response = await admin.graphql(DELETE_SHOELACE_COLOR_ENTRY, {
    variables: {
      id,
    },
  });

  const data = await response.json();
  const errors = data.data.metaobjectDelete.userErrors;

  if (errors.length) {
    throw new Error(userErrorMessage(errors));
  }
}

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  await ensureShoelaceColorsMetaobjectDefinition(admin);

  return {
    colors: await getColors(admin),
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    await ensureShoelaceColorsMetaobjectDefinition(admin);

    if (intent === "create") {
      await createColor(admin, formData);

      return { ok: true, message: "Color added" };
    }

    if (intent === "update") {
      await updateColor(admin, formData);

      return { ok: true, message: "Color updated" };
    }

    if (intent === "delete") {
      await deleteColor(admin, formData);

      return { ok: true, message: "Color deleted" };
    }

    throw new Error("Unknown settings action.");
  } catch (error) {
    return { ok: false, message: error.message };
  }
};

export default function Settings() {
  const { colors } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (!actionData?.message) {
      return;
    }

    shopify.toast.show(actionData.message, {
      isError: !actionData.ok,
    });
  }, [actionData, shopify]);

  return (
    <s-page heading="Shoelaces settings">
      <s-section>
        <div className={styles.settings}>
          {actionData?.ok === false ? (
            <div className={styles.error}>{actionData.message}</div>
          ) : null}

          <div className={styles.layout}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.title}>Color variations</h2>
                  <p className={styles.text}>
                    Add, edit, or delete the colors shown by the shoelace
                    configurator.
                  </p>
                </div>
              </div>

              <div className={styles.list}>
                {colors.length ? (
                  colors.map((color) => (
                    <div className={styles.colorRow} key={color.id}>
                      <div className={styles.colorSummary}>
                        <span
                          className={styles.swatch}
                          style={{ backgroundColor: color.hex || "#ffffff" }}
                        />
                        <div>
                          <p className={styles.colorName}>{color.name}</p>
                          <p className={styles.colorHex}>{color.hex}</p>
                        </div>
                      </div>

                      <Form method="post">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={color.id} />
                        <s-button
                          tone="critical"
                          variant="secondary"
                          type="submit"
                          {...(isSubmitting ? { disabled: true } : {})}
                        >
                          Delete
                        </s-button>
                      </Form>

                      <Form className={styles.editForm} method="post">
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={color.id} />
                        <div className={styles.inputRow}>
                          <label className={styles.field}>
                            <span className={styles.label}>Name</span>
                            <input
                              className={styles.input}
                              name="name"
                              defaultValue={color.name}
                              required
                            />
                          </label>
                          <label className={styles.field}>
                            <span className={styles.label}>Color</span>
                            <input
                              className={styles.input}
                              name="hex"
                              type="color"
                              defaultValue={color.hex || "#ffffff"}
                              required
                            />
                          </label>
                        </div>
                        <div className={styles.actions}>
                          <s-button
                            type="submit"
                            variant="secondary"
                            {...(isSubmitting ? { disabled: true } : {})}
                          >
                            Save changes
                          </s-button>
                        </div>
                      </Form>
                    </div>
                  ))
                ) : (
                  <div className={styles.empty}>No color variations yet.</div>
                )}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.title}>Add color</h2>
                  <p className={styles.text}>
                    New colors are saved as shoelaces_colors metaobjects.
                  </p>
                </div>
              </div>

              <Form className={styles.form} method="post">
                <input type="hidden" name="intent" value="create" />
                <label className={styles.field}>
                  <span className={styles.label}>Name</span>
                  <input
                    className={styles.input}
                    name="name"
                    placeholder="Neon Green"
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Color</span>
                  <input
                    className={styles.input}
                    name="hex"
                    type="color"
                    defaultValue="#22c55e"
                    required
                  />
                </label>
                <div className={styles.actions}>
                  <s-button
                    type="submit"
                    {...(isSubmitting ? { disabled: true } : {})}
                  >
                    Add color
                  </s-button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
