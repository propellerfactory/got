"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https = require("https");
const express = require("express");
const pify = require("pify");
const pem = require("pem");
const createHttpsTestServer = async (options = {}) => {
    var _a, _b;
    const createCSR = pify(pem.createCSR);
    const createCertificate = pify(pem.createCertificate);
    const caCSRResult = await createCSR({ commonName: 'authority' });
    const caResult = await createCertificate({
        csr: caCSRResult.csr,
        clientKey: caCSRResult.clientKey,
        selfSigned: true
    });
    const caKey = caResult.clientKey;
    const caCert = caResult.certificate;
    const serverCSRResult = await createCSR({ commonName: (_a = options.commonName) !== null && _a !== void 0 ? _a : 'localhost' });
    const serverResult = await createCertificate({
        csr: serverCSRResult.csr,
        clientKey: serverCSRResult.clientKey,
        serviceKey: caKey,
        serviceCertificate: caCert,
        days: (_b = options.days) !== null && _b !== void 0 ? _b : 365
    });
    const serverKey = serverResult.clientKey;
    const serverCert = serverResult.certificate;
    const server = express();
    server.https = https.createServer({
        key: serverKey,
        cert: serverCert,
        ca: caCert,
        requestCert: true,
        rejectUnauthorized: false // This should be checked by the test
    }, server);
    server.set('etag', false);
    await pify(server.https.listen.bind(server.https))();
    server.caKey = caKey;
    server.caCert = caCert;
    server.port = server.https.address().port;
    server.url = `https://localhost:${(server.port)}`;
    server.close = async () => pify(server.https.close.bind(server.https))();
    return server;
};
exports.default = createHttpsTestServer;
