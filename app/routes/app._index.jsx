import { useEffect } from "react";
import { useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import styles from "../styles/shoelaces-dashboard.module.css";

const DEFAULT_SHOELACE_COLORS = [
  { name: "Red", hex: "#ff0000" },
  { name: "Blue", hex: "#0000ff" },
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#ffffff" },
  { name: "Gold", hex: "#ffa500" },
];

const SHOELACE_PRODUCT_TAG = "shoelaces-configurator-product";
const SHOELACE_COLORS_METAOBJECT_TYPE = "shoelaces_colors";

const GET_SHOELACE_COLOR_ENTRIES = `#graphql
  query GetShoelaceColorEntries($type: String!) {
    metaobjects(first: 50, type: $type) {
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
        handle
        fields {
          key
          value
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const GET_SHOELACE_COLORS_DEFINITION = `#graphql
  query GetShoelaceColorsDefinition($type: String!) {
    metaobjectDefinitionByType(type: $type) {
      id
      name
      type
      fieldDefinitions {
        key
        name
        type {
          name
        }
      }
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
        fieldDefinitions {
          key
          name
          type {
            name
          }
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const GET_SHOP_ID = `#graphql
  query GetShopId {
    shop {
      id
    }
  }
`;

const SAVE_SHOELACE_SETTINGS = `#graphql
  mutation SaveShoelaceSettings($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
        type
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const FIND_SHOELACE_PRODUCT = `#graphql
  query FindShoelaceProduct($query: String!) {
    products(first: 1, query: $query) {
      nodes {
        id
        title
        handle
        status
        variants(first: 1) {
          nodes {
            id
            legacyResourceId
            price
          }
        }
      }
    }
  }
`;

const CREATE_SHOELACE_PRODUCT = `#graphql
  mutation CreateShoelaceProduct($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        id
        title
        handle
        status
        variants(first: 1) {
          nodes {
            id
            legacyResourceId
            price
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const UPDATE_SHOELACE_VARIANT = `#graphql
  mutation UpdateShoelaceVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        legacyResourceId
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_PUBLICATIONS = `#graphql
  query GetPublications {
    publications(first: 20) {
      nodes {
        id
        name
      }
    }
  }
`;

const PUBLISH_PRODUCT = `#graphql
  mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors {
        field
        message
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

function legacyIdFromGid(gid) {
  return gid?.split("/").pop() || "";
}

function adminProductUrl(shop, productGid) {
  const store = shop?.replace(".myshopify.com", "");
  const productId = legacyIdFromGid(productGid);

  if (!store || !productId) {
    return "";
  }

  return `https://admin.shopify.com/store/${store}/products/${productId}`;
}

async function ensureDefaultShoelaceColorEntries(admin) {
  const response = await admin.graphql(GET_SHOELACE_COLOR_ENTRIES, {
    variables: {
      type: SHOELACE_COLORS_METAOBJECT_TYPE,
    },
  });

  const data = await response.json();
  const existingEntries = data.data.metaobjects.nodes || [];

  const existingNames = existingEntries
    .map((entry) => fieldValue(entry, "name").toLowerCase())
    .filter(Boolean);

  const createdColors = [];

  for (const color of DEFAULT_SHOELACE_COLORS) {
    if (existingNames.includes(color.name.toLowerCase())) {
      continue;
    }

    const createResponse = await admin.graphql(CREATE_SHOELACE_COLOR_ENTRY, {
      variables: {
        metaobject: {
          type: SHOELACE_COLORS_METAOBJECT_TYPE,
          handle: `shoelaces-color-${color.name.toLowerCase()}`,
          fields: [
            {
              key: "name",
              value: color.name,
            },
            {
              key: "hex",
              value: color.hex,
            },
          ],
        },
      },
    });

    const createData = await createResponse.json();
    const errors = createData.data.metaobjectCreate.userErrors;

    if (errors.length) {
      throw new Error(errors.map((error) => error.message).join(", "));
    }

    createdColors.push(createData.data.metaobjectCreate.metaobject);
    existingNames.push(color.name.toLowerCase());
  }

  const refreshedResponse = createdColors.length
    ? await admin.graphql(GET_SHOELACE_COLOR_ENTRIES, {
        variables: {
          type: SHOELACE_COLORS_METAOBJECT_TYPE,
        },
      })
    : null;
  const refreshedData = refreshedResponse ? await refreshedResponse.json() : null;
  const allEntries =
    refreshedData?.data?.metaobjects?.nodes || existingEntries.concat(createdColors);

  return {
    existingCount: existingEntries.length,
    createdCount: createdColors.length,
    createdColors,
    colors: allEntries.map(colorFromEntry),
  };
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
    return {
      created: false,
      definition: existingDefinition,
    };
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
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return {
    created: true,
    definition: createData.data.metaobjectDefinitionCreate.metaobjectDefinition,
  };
}

async function findShoelaceProduct(admin) {
  const response = await admin.graphql(FIND_SHOELACE_PRODUCT, {
    variables: {
      query: `tag:${SHOELACE_PRODUCT_TAG}`,
    },
  });

  const data = await response.json();

  return data.data.products.nodes[0] || null;
}

async function createShoelaceProduct(admin) {
  const response = await admin.graphql(CREATE_SHOELACE_PRODUCT, {
    variables: {
      product: {
        title: "Custom Shoelaces",
        vendor: "Shoelaces Configurator",
        productType: "Custom Product",
        tags: [SHOELACE_PRODUCT_TAG],
        status: "ACTIVE",
      },
    },
  });

  const data = await response.json();
  const errors = data.data.productCreate.userErrors;

  if (errors.length) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  const product = data.data.productCreate.product;
  const variant = product.variants.nodes[0];

  const variantResponse = await admin.graphql(UPDATE_SHOELACE_VARIANT, {
    variables: {
      productId: product.id,
      variants: [
        {
          id: variant.id,
          price: "5.00",
        },
      ],
    },
  });

  const variantData = await variantResponse.json();
  const variantErrors =
    variantData.data.productVariantsBulkUpdate.userErrors || [];

  if (variantErrors.length) {
    throw new Error(variantErrors.map((error) => error.message).join(", "));
  }

  const updatedVariant =
    variantData.data.productVariantsBulkUpdate.productVariants[0];

  return {
    ...product,
    variants: {
      nodes: [updatedVariant],
    },
  };
}

async function saveShoelaceVariantIdToShop(admin, variantId) {
  const shopResponse = await admin.graphql(GET_SHOP_ID);
  const shopData = await shopResponse.json();
  const shopId = shopData.data.shop.id;

  const response = await admin.graphql(SAVE_SHOELACE_SETTINGS, {
    variables: {
      metafields: [
        {
          ownerId: shopId,
          namespace: "shoelaces_configurator",
          key: "variant_id",
          type: "single_line_text_field",
          value: String(variantId),
        },
      ],
    },
  });

  const data = await response.json();
  const errors = data.data.metafieldsSet.userErrors;

  if (errors.length) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return data.data.metafieldsSet.metafields[0];
}

async function publishProductToSalesChannels(admin, productId) {
  const publicationsResponse = await admin.graphql(GET_PUBLICATIONS);
  const publicationsData = await publicationsResponse.json();
  const publications = publicationsData.data.publications.nodes;

  const targetNames = ["online store", "point of sale", "shop"];

  const targetPublications = publications.filter((publication) => {
    const name = publication.name.toLowerCase();

    return targetNames.some((targetName) => name.includes(targetName));
  });

  if (!targetPublications.length) {
    throw new Error("No matching sales channel publications were found.");
  }

  const publishResponse = await admin.graphql(PUBLISH_PRODUCT, {
    variables: {
      id: productId,
      input: targetPublications.map((publication) => ({
        publicationId: publication.id,
      })),
    },
  });

  const publishData = await publishResponse.json();
  const errors = publishData.data.publishablePublish.userErrors;

  if (errors.length) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return targetPublications.map((publication) => publication.name);
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    let product = await findShoelaceProduct(admin);
    let created = false;

    if (!product) {
      product = await createShoelaceProduct(admin);
      created = true;
    }

    const variant = product.variants.nodes[0];

    await saveShoelaceVariantIdToShop(admin, variant.legacyResourceId);

    const publishedTo = await publishProductToSalesChannels(admin, product.id);

    const colorsDefinition =
      await ensureShoelaceColorsMetaobjectDefinition(admin);
    const defaultColors = await ensureDefaultShoelaceColorEntries(admin);

    return {
      ok: true,
      created,
      shop: session.shop,
      productId: product.id,
      productNumericId: legacyIdFromGid(product.id),
      productTitle: product.title,
      productHandle: product.handle,
      productStatus: product.status,
      variantGid: variant.id,
      variantId: variant.legacyResourceId,
      variantPrice: variant.price,
      adminProductUrl: adminProductUrl(session.shop, product.id),
      publishedTo,
      colorsDefinition,
      defaultColors,
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }
};

export default function Index() {
  const data = useLoaderData();
  const shopify = useAppBridge();

  useEffect(() => {
    if (data?.ok && data?.created) {
      shopify.toast.show("Shoelace product created automatically");
    }

    if (!data?.ok) {
      shopify.toast.show("Shoelace product setup failed", {
        isError: true,
      });
    }
  }, [data, shopify]);

  const colors = data.ok ? data.defaultColors.colors : [];
  const setupSteps = [
    {
      title: "Product",
      text: data.ok
        ? `${data.productTitle} is available for configured lace orders.`
        : "The automatic product check did not complete.",
    },
    {
      title: "Variant",
      text: data.ok
        ? `Variant ${data.variantId} is saved to the shop metafield.`
        : "The variant ID could not be saved yet.",
    },
    {
      title: "Theme app block",
      text: "Add the Shoelaces Configurator block to a product template in the Shopify theme editor.",
    },
  ];

  return (
    <s-page heading="Shoelaces Admin">
      <s-section>
        <div className={styles.dashboard}>
          <div className={styles.hero}>
            <div className={styles.heroPanel}>
              <p className={styles.eyebrow}>{data.ok ? data.shop : "Setup issue"}</p>
              <h2 className={styles.headline}>
                Manage the custom shoelace configurator from one dashboard.
              </h2>
              <p className={styles.lede}>
                Track the generated product, saved variant ID, sales channel
                publishing, and color metaobjects that power the storefront
                configurator.
              </p>
              <div className={styles.actions}>
                {data.ok && data.adminProductUrl ? (
                  <s-button href={data.adminProductUrl} target="_blank">
                    Open product
                  </s-button>
                ) : null}
                <s-button href="/app/additional" variant="secondary">
                  Setup guide
                </s-button>
              </div>
            </div>

            <div className={styles.statusPanel}>
              <span
                className={`${styles.statusBadge} ${
                  data.ok ? "" : styles.statusBadgeError
                }`}
              >
                {data.ok ? "Ready" : "Needs attention"}
              </span>
              <h3 className={styles.statusTitle}>
                {data.ok
                  ? data.created
                    ? "Product created for this store"
                    : "Product already configured"
                  : "Automatic setup failed"}
              </h3>
              <p className={styles.statusText}>
                {data.ok
                  ? "The app can pass the saved variant ID to the theme extension."
                  : data.error}
              </p>
            </div>
          </div>

          {data.ok ? (
            <>
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <p className={styles.metricLabel}>Product status</p>
                  <p className={styles.metricValue}>{data.productStatus}</p>
                  <p className={styles.metricHint}>Tagged configurator product</p>
                </div>
                <div className={styles.metric}>
                  <p className={styles.metricLabel}>Variant ID</p>
                  <p className={styles.metricValue}>{data.variantId}</p>
                  <p className={styles.metricHint}>Stored on the shop metafield</p>
                </div>
                <div className={styles.metric}>
                  <p className={styles.metricLabel}>Base price</p>
                  <p className={styles.metricValue}>${data.variantPrice}</p>
                  <p className={styles.metricHint}>Default lace product variant</p>
                </div>
                <div className={styles.metric}>
                  <p className={styles.metricLabel}>Colors</p>
                  <p className={styles.metricValue}>{colors.length}</p>
                  <p className={styles.metricHint}>
                    {data.defaultColors.createdCount} added on this check
                  </p>
                </div>
              </div>

              <div className={styles.grid}>
                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <h3 className={styles.panelTitle}>Configurator product</h3>
                      <p className={styles.muted}>
                        Core storefront product and publishing details.
                      </p>
                    </div>
                  </div>

                  <div className={styles.table}>
                    <div className={styles.row}>
                      <span className={styles.label}>Title</span>
                      <span className={styles.value}>{data.productTitle}</span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.label}>Handle</span>
                      <span className={styles.value}>{data.productHandle}</span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.label}>Product ID</span>
                      <span className={styles.value}>{data.productNumericId}</span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.label}>Sales channels</span>
                      <ul className={styles.channels}>
                        {data.publishedTo.map((publication) => (
                          <li className={styles.chip} key={publication}>
                            {publication}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <h3 className={styles.panelTitle}>Color library</h3>
                      <p className={styles.muted}>Metaobjects available to the theme.</p>
                    </div>
                    <s-button href="/app/settings" variant="secondary">
                      Manage
                    </s-button>
                  </div>

                  <div className={styles.swatches}>
                    {colors.map((color) => (
                      <div className={styles.swatch} key={color.id || color.name}>
                        <span
                          className={styles.swatchColor}
                          style={{ backgroundColor: color.hex || "#ffffff" }}
                        />
                        <div>
                          <p className={styles.swatchName}>{color.name}</p>
                          <p className={styles.swatchHex}>{color.hex}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3 className={styles.panelTitle}>Next setup steps</h3>
                    <p className={styles.muted}>
                      Use these checks when installing the configurator on a store.
                    </p>
                  </div>
                </div>

                <ol className={styles.steps}>
                  {setupSteps.map((step, index) => (
                    <li className={styles.step} key={step.title}>
                      <span className={styles.stepNumber}>{index + 1}</span>
                      <p className={styles.stepTitle}>{step.title}</p>
                      <p className={styles.stepText}>{step.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          ) : (
            <div className={styles.errorBox}>
              <h3 className={styles.panelTitle}>Setup response</h3>
              <p className={styles.detailText}>
                Shopify returned an error while preparing the product or
                metaobjects. The raw response is included for debugging.
              </p>
              <pre className={styles.debug}>
                <code>{JSON.stringify(data, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
