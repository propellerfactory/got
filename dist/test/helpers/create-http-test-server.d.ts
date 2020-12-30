/// <reference types="node" />
import http = require('http');
import express = require('express');
export declare type HttpServerOptions = {
    bodyParser?: express.NextFunction | false;
};
export interface ExtendedHttpTestServer extends express.Express {
    http: http.Server;
    url: string;
    port: number;
    hostname: string;
    close: () => Promise<any>;
}
declare const createHttpTestServer: (options?: HttpServerOptions) => Promise<ExtendedHttpTestServer>;
export default createHttpTestServer;
