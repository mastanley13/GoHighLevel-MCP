// src/express-list-endpoints.d.ts
import { Application } from 'express';

interface Endpoint {
  path: string;
  methods: string[];
}

/**
 * Returns a list of all registered Express routes:
 *   listEndpoints(app) => Array<{ path, methods }>
 */
declare function listEndpoints(app: Application): Endpoint[];
export default listEndpoints;
