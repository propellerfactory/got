"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https = require("https");
// @ts-expect-error No types
const createCert = require("create-cert");
(async () => {
    const keys = await createCert({ days: 365, commonName: 'localhost' });
    const server = https.createServer(keys, (_request, response) => {
        response.end('ok');
    }).listen(8080, () => {
        const { port } = server.address();
        console.log(`Listening at https://localhost:${port}`);
    });
})();
