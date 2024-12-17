const OFFERS = [
  {
    id: "gid://shopify/Product/9030540132584",
    legacyResourceId: "9030540132584",
    title: "t-short",
    featuredImage: null,
    description: "desc",
    variants: {
      edges: [
        {
          node: {
            price: "123.00",
            compareAtPrice: null,
            id: "gid://shopify/ProductVariant/46911531614440",
            legacyResourceId: "46911531614440",
          },
        },
      ],
    },
  },
];

/*
 * For testing purposes, product information is hardcoded.
 * In a production application, replace this function with logic to determine
 * what product to offer to the customer.
 */
export function getOffers() {
  return OFFERS;
}

/*
 * Retrieve discount information for the specific order on the backend instead of relying
 * on the discount information that is sent from the frontend.
 * This is to ensure that the discount information is not tampered with.
 */
export function getSelectedOffer(offerId) {
  return OFFERS.find((offer) => offer.id === offerId);
}
