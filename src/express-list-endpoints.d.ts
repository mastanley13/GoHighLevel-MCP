// src/express-list-endpoints.d.ts
declare module 'express-list-endpoints' {
  import { Application } from 'express';
  interface Endpoint {
    path: string;
    methods: string[];
    // you can add more fields here if you like
  }
  function listEndpoints(app: Application): Endpoint[];
  export default listEndpoints;
}