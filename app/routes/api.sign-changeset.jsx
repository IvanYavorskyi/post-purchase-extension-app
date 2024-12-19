import { json } from "@remix-run/node";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

import db from "../db.server";
import { authenticate } from "../shopify.server";
import { getSelectedOffer } from "../offer.server";

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

  const body = await request.json();

  const selectedOffer = await getSelectedOffer(
    body.changes,
    session.accessToken,
    shop,
  );

  const payload = {
    iss: process.env.SHOPIFY_API_KEY,
    jti: uuidv4(),
    iat: Date.now(),
    sub: body.referenceId,
    changes: selectedOffer?.changes,
  };

  const token = jwt.sign(payload, process.env.SHOPIFY_API_SECRET);
  return cors(json({ token }));
};
