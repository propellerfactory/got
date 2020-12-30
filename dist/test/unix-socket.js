"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const ava_1 = require("ava");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const okHandler = (_request, response) => {
    response.end('ok');
};
if (process.platform !== 'win32') {
    ava_1.default('works', with_server_1.withSocketServer, async (t, server) => {
        server.on('/', okHandler);
        const url = util_1.format('http://unix:%s:%s', server.socketPath, '/');
        t.is((await source_1.default(url)).body, 'ok');
    });
    ava_1.default('protocol-less works', with_server_1.withSocketServer, async (t, server) => {
        server.on('/', okHandler);
        const url = util_1.format('unix:%s:%s', server.socketPath, '/');
        t.is((await source_1.default(url)).body, 'ok');
    });
    ava_1.default('address with : works', with_server_1.withSocketServer, async (t, server) => {
        server.on('/foo:bar', okHandler);
        const url = util_1.format('unix:%s:%s', server.socketPath, '/foo:bar');
        t.is((await source_1.default(url)).body, 'ok');
    });
    ava_1.default('throws on invalid URL', async (t) => {
        try {
            await source_1.default('unix:', { retry: 0 });
        }
        catch (error) {
            t.regex(error.code, /ENOTFOUND|EAI_AGAIN/);
        }
    });
    ava_1.default('works when extending instances', with_server_1.withSocketServer, async (t, server) => {
        server.on('/', okHandler);
        const url = util_1.format('unix:%s:%s', server.socketPath, '/');
        const instance = source_1.default.extend({ prefixUrl: url });
        t.is((await instance('')).body, 'ok');
    });
    ava_1.default('passes search params', with_server_1.withSocketServer, async (t, server) => {
        server.on('/?a=1', okHandler);
        const url = util_1.format('http://unix:%s:%s', server.socketPath, '/?a=1');
        t.is((await source_1.default(url)).body, 'ok');
    });
}
