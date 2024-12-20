import { authenticate } from "../shopify.server";
import db from "../db.server";

const appUninstalledHandler = async (shop, session) => {
  try {
    console.log({ shop, session });
    if (session) {
      await db.session.deleteMany({ where: { shop } });
    }
  } catch (error) {
    console.error(error.message);
    throw new Response(error.message, { status: 500 });
  }
};

export const action = async ({ request }) => {
  console.log("Webhooks.jsx action");
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  if (!admin) {
    throw new Response();
  }

  switch (topic) {
    case "APP_UNINSTALLED":
      await appUninstalledHandler(shop, session);
      break;
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
