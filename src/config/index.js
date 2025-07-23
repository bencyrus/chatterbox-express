/**
 * Configuration Index
 * Main configuration module that exports all configuration components
 */

import config from "./environment.js";
import database from "./database.js";

export { config, database };

export default {
  ...config,
  database,
};
