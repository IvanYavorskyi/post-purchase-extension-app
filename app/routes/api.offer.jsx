import { json } from "@remix-run/node";
import db from "../db.server";

import { authenticate } from "../shopify.server";
import { getOffer } from "../offer.server";

// The loader responds to preflight requests from Shopify
export const loader = async ({ request }) => {
  await authenticate.public.checkout(request);
};

// The action responds to the POST request from the extension. Make sure to use the cors helper for the request to work.
export const action = async ({ request }) => {
  const { cors, sessionToken } = await authenticate.public.checkout(request);

  const shop = sessionToken.input_data.shop.domain;
  const session = await db.session.findFirst({
    where: { shop: shop },
    select: { accessToken: true },
  });

  console.log({ shop, sessionToken, accessToken: session.accessToken });
  const offer = getOffer(session.accessToken, shop);
  return cors(json({ offer }));
};
