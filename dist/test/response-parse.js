"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const getStream = require("get-stream");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const dog = { data: 'dog' };
const jsonResponse = JSON.stringify(dog);
const defaultHandler = (_request, response) => {
    response.end(jsonResponse);
};
ava_1.default('`options.resolveBodyOnly` works', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    t.deepEqual(await got({ responseType: 'json', resolveBodyOnly: true }), dog);
});
ava_1.default('`options.resolveBodyOnly` combined with `options.throwHttpErrors`', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 404;
        response.end('/');
    });
    t.is(await got({ resolveBodyOnly: true, throwHttpErrors: false }), '/');
});
ava_1.default('JSON response', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    t.deepEqual((await got({ responseType: 'json' })).body, dog);
});
ava_1.default('Buffer response', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    t.deepEqual((await got({ responseType: 'buffer' })).body, Buffer.from(jsonResponse));
});
ava_1.default('Text response', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    t.is((await got({ responseType: 'text' })).body, jsonResponse);
});
ava_1.default('Text response #2', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    t.is((await got({ responseType: undefined })).body, jsonResponse);
});
ava_1.default('JSON response - promise.json()', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    t.deepEqual(await got('').json(), dog);
});
ava_1.default('Buffer response - promise.buffer()', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    t.deepEqual(await got('').buffer(), Buffer.from(jsonResponse));
});
ava_1.default('Text response - promise.text()', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    t.is(await got('').text(), jsonResponse);
});
ava_1.default('Text response - promise.json().text()', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    t.is(await got('').json().text(), jsonResponse);
});
ava_1.default('works if promise has been already resolved', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    const promise = got('').text();
    t.is(await promise, jsonResponse);
    t.deepEqual(await promise.json(), dog);
});
ava_1.default('throws an error on invalid response type', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    // @ts-expect-error Error tests
    const error = await t.throwsAsync(got({ responseType: 'invalid' }));
    t.regex(error.message, /^Unknown body type 'invalid'/);
    t.true(error.message.includes(error.options.url.hostname));
    t.is(error.options.url.pathname, '/');
});
ava_1.default('wraps parsing errors', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('/');
    });
    const error = await t.throwsAsync(got({ responseType: 'json' }), { instanceOf: got.ParseError });
    t.true(error.message.includes(error.options.url.hostname));
    t.is(error.options.url.pathname, '/');
});
ava_1.default('parses non-200 responses', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 500;
        response.end(jsonResponse);
    });
    const error = await t.throwsAsync(got({ responseType: 'json', retry: 0 }), { instanceOf: source_1.HTTPError });
    t.deepEqual(error.response.body, dog);
});
ava_1.default('ignores errors on invalid non-200 responses', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 500;
        response.end('Internal error');
    });
    const error = await t.throwsAsync(got({ responseType: 'json', retry: 0 }), {
        instanceOf: got.HTTPError,
        message: 'Response code 500 (Internal Server Error)'
    });
    t.is(error.response.body, 'Internal error');
    t.is(error.options.url.pathname, '/');
});
ava_1.default('parse errors have `response` property', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('/');
    });
    const error = await t.throwsAsync(got({ responseType: 'json' }), { instanceOf: source_1.ParseError });
    t.is(error.response.statusCode, 200);
    t.is(error.response.body, '/');
});
ava_1.default('sets correct headers', with_server_1.default, async (t, server, got) => {
    server.post('/', (request, response) => {
        response.end(JSON.stringify(request.headers));
    });
    const { body: headers } = await got.post({ responseType: 'json', json: {} });
    t.is(headers['content-type'], 'application/json');
    t.is(headers.accept, 'application/json');
});
ava_1.default('doesn\'t throw on 204 No Content', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 204;
        response.end();
    });
    const body = await got('').json();
    t.is(body, '');
});
ava_1.default('doesn\'t throw on empty bodies', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 200;
        response.end();
    });
    const body = await got('').json();
    t.is(body, '');
});
ava_1.default('.buffer() returns binary content', with_server_1.default, async (t, server, got) => {
    const body = Buffer.from('89504E470D0A1A0A0000000D49484452', 'hex');
    server.get('/', (_request, response) => {
        response.end(body);
    });
    const buffer = await got('').buffer();
    t.is(Buffer.compare(buffer, body), 0);
});
ava_1.default('shortcuts throw ParseErrors', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('not a json');
    });
    await t.throwsAsync(got('').json(), {
        instanceOf: source_1.ParseError,
        message: /^Unexpected token o in JSON at position 1 in/
    });
});
ava_1.default('shortcuts result properly when retrying in afterResponse', with_server_1.default, async (t, server, got) => {
    const nasty = JSON.stringify({ hello: 'nasty' });
    const proper = JSON.stringify({ hello: 'world' });
    server.get('/', (request, response) => {
        if (request.headers.token === 'unicorn') {
            response.end(proper);
        }
        else {
            response.statusCode = 401;
            response.end(nasty);
        }
    });
    const promise = got({
        hooks: {
            afterResponse: [
                (response, retryWithMergedOptions) => {
                    if (response.statusCode === 401) {
                        return retryWithMergedOptions({
                            headers: {
                                token: 'unicorn'
                            }
                        });
                    }
                    return response;
                }
            ]
        }
    });
    const json = await promise.json();
    const text = await promise.text();
    const buffer = await promise.buffer();
    t.is(json.hello, 'world');
    t.is(text, proper);
    t.is(buffer.compare(Buffer.from(proper)), 0);
});
ava_1.default('responseType is optional when using template', with_server_1.default, async (t, server, got) => {
    const data = { hello: 'world' };
    server.post('/', async (request, response) => {
        response.end(await getStream(request));
    });
    const jsonClient = got.extend({ responseType: 'json' });
    const { body } = await jsonClient.post('', { json: data });
    t.deepEqual(body, data);
});
ava_1.default('JSON response custom parser', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    t.deepEqual((await got({
        responseType: 'json',
        parseJson: text => ({ ...JSON.parse(text), custom: 'parser' })
    })).body, { ...dog, custom: 'parser' });
});
