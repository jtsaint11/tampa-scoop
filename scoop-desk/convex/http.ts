import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
// Convex Auth HTTP routes (JWKS / OpenID config used to verify sessions).
auth.addHttpRoutes(http);

export default http;
