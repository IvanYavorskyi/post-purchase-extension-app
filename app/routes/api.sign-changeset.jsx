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

  const { changes, quantity = 1, referenceId } = body;

  const selectedOffer = await getSelectedOffer(
    changes,
    session.accessToken,
    shop,
  );

  if (!selectedOffer) {
    return cors(json({ error: "Offer not found" }, { status: 404 }));
  }

  const updatedChanges = selectedOffer.changes.map((change) =>
    change.type === "add_variant" ? { ...change, quantity } : change,
  );

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
