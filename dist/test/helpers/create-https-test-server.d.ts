/// <reference types="node" />
import https = require('https');
import express = require('express');
export declare type HttpsServerOptions = {
    commonName?: string;
    days?: number;
};
export interface ExtendedHttpsTestServer extends express.Express {
    https: https.Server;
    caKey: Buffer;
    caCert: Buffer;
    url: string;
    port: number;
    close: () => Promise<any>;
}
declare const createHttpsTestServer: (options?: HttpsServerOptions) => Promise<ExtendedHttpsTestServer>;
export default createHttpsTestServer;
