"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
ava_1.default('works', with_server_1.default, async (t, server) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    server.get('/404', (_request, response) => {
        response.statusCode = 404;
        response.end('not found');
    });
    t.is((await source_1.default.get(server.url)).body, 'ok');
    const error = await t.throwsAsync(source_1.default.get(`${server.url}/404`), { instanceOf: source_1.HTTPError });
    t.is(error.response.body, 'not found');
    await t.throwsAsync(source_1.default.get('.com', { retry: 0 }), { message: 'Invalid URL: .com' });
});
