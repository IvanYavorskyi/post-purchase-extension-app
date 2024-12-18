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

  console.log({ variantResponse });

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
    id: 1,
    title: "One time offer",
    productTitle: variantNode.product.title,
    productImageURL:
      variantNode.product.featuredMedia?.preview?.image?.url || "",
    productDescription: variantNode.product.description || "",
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
