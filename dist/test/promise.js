"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const http_1 = require("http");
const ava_1 = require("ava");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
ava_1.default('emits request event as promise', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 200;
        response.end('null');
    });
    await got('').json().on('request', (request) => {
        t.true(request instanceof http_1.ClientRequest);
    });
});
ava_1.default('emits response event as promise', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 200;
        response.end('null');
    });
    await got('').json().on('response', (response) => {
        t.true(response instanceof http_1.IncomingMessage);
        t.true(response.readable);
        t.is(response.statusCode, 200);
        t.is(response.ip, '127.0.0.1');
    });
});
ava_1.default('returns buffer on compressed response', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('content-encoding', 'gzip');
        response.end();
    });
    const { body } = await got({ decompress: false });
    t.true(Buffer.isBuffer(body));
});
ava_1.default('no unhandled `The server aborted pending request` rejection', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 503;
        response.write('asdf');
        setTimeout(() => {
            response.end();
        }, 100);
    });
    await t.throwsAsync(got(''));
});
ava_1.default('promise.json() can be called before a file stream body is open', with_server_1.default, async (t, server, got) => {
    server.post('/', (request, response) => {
        request.resume();
        request.once('end', () => {
            response.end('""');
        });
    });
    // @ts-expect-error @types/node has wrong types.
    const body = new fs_1.ReadStream('', {
        fs: {
            open: () => { },
            read: () => { },
            close: () => { }
        }
    });
    const promise = got({ body });
    const checks = [
        t.throwsAsync(promise, { instanceOf: source_1.CancelError }),
        t.throwsAsync(promise.json(), { instanceOf: source_1.CancelError })
    ];
    promise.cancel();
    await Promise.all(checks);
});
