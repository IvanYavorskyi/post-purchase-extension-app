import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    console.log("Starting authentication...");

    return authenticate.admin(request);
  } catch (error) {
    console.error("Error during authentication:", error);
    return new Response("Authentication error.", { status: 500 });
  }
};
