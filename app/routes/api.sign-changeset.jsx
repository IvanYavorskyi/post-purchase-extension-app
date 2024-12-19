import { json } from "@remix-run/node";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

import db from "../db.server";
import { authenticate } from "../shopify.server";
import { getSelectedOffer } from "../offer.server";

export const loader = async ({ request }) => {
  await authenticate.public.checkout(request);
};

export const action = async ({ request }) => {
  const { cors, sessionToken } = await authenticate.public.checkout(request);

  const shop = sessionToken.input_data.shop.domain;
  const session = await db.session.findFirst({
    where: { shop },
    select: { accessToken: true },
  });

  const body = await request.json();
  const { changes, referenceId } = body;

  const selectedOffer = await getSelectedOffer(
    changes[0].variantID,
    session.accessToken,
    shop,
  );

  if (!selectedOffer) {
    return cors(json({ error: "Offer not found" }, { status: 404 }));
  }

  const updatedChanges = changes.map((change) => {
    if (change.type === "add_variant") {
      const { size, ...validChange } = change;
      return validChange;
    }

    if (change.type === "add_shipping_line") {
      const { variantID, quantity, ...shippingChange } = change;
      return shippingChange;
    }

    return change;
  });

  const payload = {
    iss: process.env.SHOPIFY_API_KEY,
    jti: uuidv4(),
    iat: Date.now(),
    sub: referenceId,
    changes: updatedChanges,
  };

  const token = jwt.sign(payload, process.env.SHOPIFY_API_SECRET);
  return cors(json({ token }));
};
