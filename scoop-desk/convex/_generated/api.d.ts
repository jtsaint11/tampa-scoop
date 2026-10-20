/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as auth from "../auth.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as deletes from "../deletes.js";
import type * as feeds from "../feeds.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as issues from "../issues.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_desk from "../lib/desk.js";
import type * as lib_directory from "../lib/directory.js";
import type * as lib_events from "../lib/events.js";
import type * as lib_render from "../lib/render.js";
import type * as lib_sections from "../lib/sections.js";
import type * as lib_tampa from "../lib/tampa.js";
import type * as lib_tombstones from "../lib/tombstones.js";
import type * as sections from "../sections.js";
import type * as sheetsGateway from "../sheetsGateway.js";
import type * as stories from "../stories.js";
import type * as sync from "../sync.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  auth: typeof auth;
  constants: typeof constants;
  crons: typeof crons;
  deletes: typeof deletes;
  feeds: typeof feeds;
  functions: typeof functions;
  http: typeof http;
  issues: typeof issues;
  "lib/access": typeof lib_access;
  "lib/desk": typeof lib_desk;
  "lib/directory": typeof lib_directory;
  "lib/events": typeof lib_events;
  "lib/render": typeof lib_render;
  "lib/sections": typeof lib_sections;
  "lib/tampa": typeof lib_tampa;
  "lib/tombstones": typeof lib_tombstones;
  sections: typeof sections;
  sheetsGateway: typeof sheetsGateway;
  stories: typeof stories;
  sync: typeof sync;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
