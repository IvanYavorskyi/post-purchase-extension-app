export async function getOffer(accessToken, shopName) {
  const variantQuery = `
      query {
          productVariants(first: 10) {
              edges {
                  node {
                      product {
                          featuredMedia {
                              preview {
                                  image {
                                      url
                                  }
                              }
                          }
                          title
                          description
                      }
                      title
                      price
                      id
                  }
              }
          }
      }
  `;

  const variantResponse = await fetchGraphQL(
    accessToken,
    shopName,
    variantQuery,
  );

  if (!variantResponse?.data?.productVariants?.edges?.length) {
    throw new Error("No product variants found.");
  }

  const randomIndex = Math.floor(
    Math.random() * variantResponse.data.productVariants.edges.length,
  );
  const variantNode =
    variantResponse.data.productVariants.edges[randomIndex].node;

  const variantID = variantNode.id.split("/")[4];

  const offer = {
    id: parseInt(variantID, 10),
    title: "One time offer",
    productTitle: variantNode.product.title,
    productImageURL:
      variantNode.product.featuredMedia?.preview?.image?.url || "",
    productDescription:
      variantNode.product.description || "some random description",
    originalPrice: variantNode.price,
    discountedPrice: variantNode.price,
    changes: [
      {
        type: "add_variant",
        variantID: variantID,
        quantity: 1,
        discount: {
          value: 15,
          valueType: "percentage",
          title: "15% off",
        },
      },
      { type: "add_shipping_line", price: 10 },
    ],
  };

  return offer;
}

async function fetchGraphQL(accessToken, shopName, query) {
  const response = await fetch(
    `https://${shopName}/admin/api/2024-10/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query }),
    },
  );
  return response.json();
}

export async function getSelectedOffer(offerId, accessToken, shopName) {
  try {
    const query = `
      query {
        productVariant(id: "gid://shopify/ProductVariant/${offerId}") {
          id
          title
          price
          product {
            title
            description
            featuredMedia {
              preview {
                image {
                  url
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetchGraphQL(accessToken, shopName, query);

    if (!response?.data?.productVariant) {
      return null;
    }

    const product = response.data.productVariant;

    return {
      id: parseInt(product.id.split("/").pop(), 10),
      title: "One time offer",
      productTitle: product.product.title,
      productImageURL: product.product.featuredMedia?.preview?.image?.url || "",
      productDescription: [
        product.product.description || "No description available",
      ],
      originalPrice: product.price,
      discountedPrice: (product.price * 0.85).toFixed(2), // Assuming 15% off
      changes: [
        {
          type: "add_variant",
          variantID: parseInt(product.id.split("/").pop(), 10),
          quantity: 1,
          discount: {
            value: 15,
            valueType: "percentage",
            title: "15% off",
          },
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching selected offer:", error);
    return null;
  }
}
