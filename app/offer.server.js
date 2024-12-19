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
                          options {
                            name
                            values
                          }
                          variants(first: 10) {
                            edges {
                              node {
                                id
                                title
                                price
                                selectedOptions {
                                  name
                                  value
                                }
                              }
                            }
                          }
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

  // TODO remove after testing
  // const variantNode = {
  //   id: "gid://shopify/ProductVariant/44107467751607",
  //   title: "L",
  //   price: "33.00",
  //   product: {
  //     title: "T-shirt",
  //     description: "Description",
  //     featuredMedia: {
  //       preview: {
  //         image: {
  //           url: "https://cdn.shopify.com/s/files/1/0673/2015/2247/files/theme_cover_image.jpg?v=1734541767",
  //         },
  //       },
  //     },
  //     options: [
  //       {
  //         name: "Size",
  //         values: ["S", "XS", "2XS", "M", "L"],
  //       },
  //     ],
  //     variants: {
  //       edges: [
  //         {
  //           node: {
  //             id: "gid://shopify/ProductVariant/44107467620535",
  //             title: "S",
  //             price: "33.00",
  //             selectedOptions: [
  //               {
  //                 name: "Size",
  //                 value: "S",
  //               },
  //             ],
  //           },
  //         },
  //         {
  //           node: {
  //             id: "gid://shopify/ProductVariant/44107467653303",
  //             title: "XS",
  //             price: "33.00",
  //             selectedOptions: [
  //               {
  //                 name: "Size",
  //                 value: "XS",
  //               },
  //             ],
  //           },
  //         },
  //         {
  //           node: {
  //             id: "gid://shopify/ProductVariant/44107467686071",
  //             title: "2XS",
  //             price: "33.00",
  //             selectedOptions: [
  //               {
  //                 name: "Size",
  //                 value: "2XS",
  //               },
  //             ],
  //           },
  //         },
  //         {
  //           node: {
  //             id: "gid://shopify/ProductVariant/44107467718839",
  //             title: "M",
  //             price: "33.00",
  //             selectedOptions: [
  //               {
  //                 name: "Size",
  //                 value: "M",
  //               },
  //             ],
  //           },
  //         },
  //         {
  //           node: {
  //             id: "gid://shopify/ProductVariant/44107467751607",
  //             title: "L",
  //             price: "33.00",
  //             selectedOptions: [
  //               {
  //                 name: "Size",
  //                 value: "L",
  //               },
  //             ],
  //           },
  //         },
  //       ],
  //     },
  //   },
  // };
  // const variantID = "44107467751607";

  const sizeVariants =
    variantNode.product?.variants?.edges
      ?.filter(({ node }) =>
        node.selectedOptions.some((option) => option.name === "Size"),
      )
      ?.map(({ node }) => ({
        size: node.selectedOptions.find((option) => option.name === "Size")
          ?.value,
        variantID: node.id.split("/").pop(),
      })) || [];

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
    sizeOptions: sizeVariants,
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

  console.log({ response });

  if (!response.ok) throw new Error("Fetch request failed.");

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
            options {
              name
              values
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  selectedOptions {
                    name
                    value
                  }
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

    const sizeVariants =
      product.product?.variants?.edges
        ?.filter(({ node }) =>
          node.selectedOptions.some((option) => option.name === "Size"),
        )
        ?.map(({ node }) => ({
          size: node.selectedOptions.find((option) => option.name === "Size")
            ?.value,
          variantID: node.id.split("/").pop(),
        })) || [];

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
      sizeOptions: sizeVariants,
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
