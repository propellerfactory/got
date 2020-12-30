"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const zlib_1 = require("zlib");
const ava_1 = require("ava");
const pEvent = require("p-event");
const getStream = require("get-stream");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const cacheable_lookup_1 = require("cacheable-lookup");
const delay = require("delay");
const cacheEndpoint = (_request, response) => {
    response.setHeader('Cache-Control', 'public, max-age=60');
    response.end(Date.now().toString());
};
ava_1.default('non-cacheable responses are not cached', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Cache-Control', 'public, no-cache, no-store');
        response.end(Date.now().toString());
    });
    const cache = new Map();
    const firstResponseInt = Number((await got({ cache })).body);
    const secondResponseInt = Number((await got({ cache })).body);
    t.is(cache.size, 0);
    t.true(firstResponseInt < secondResponseInt);
});
ava_1.default('cacheable responses are cached', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const firstResponse = await got({ cache });
    const secondResponse = await got({ cache });
    t.is(cache.size, 1);
    t.is(firstResponse.body, secondResponse.body);
});
ava_1.default('cached response is re-encoded to current encoding option', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const firstEncoding = 'base64';
    const secondEncoding = 'hex';
    const firstResponse = await got({ cache, encoding: firstEncoding });
    const secondResponse = await got({ cache, encoding: secondEncoding });
    const expectedSecondResponseBody = Buffer.from(firstResponse.body, firstEncoding).toString(secondEncoding);
    t.is(cache.size, 1);
    t.is(secondResponse.body, expectedSecondResponseBody);
});
ava_1.default('redirects are cached and re-used internally', with_server_1.default, async (t, server, got) => {
    let status301Index = 0;
    server.get('/301', (_request, response) => {
        if (status301Index === 0) {
            response.setHeader('Cache-Control', 'public, max-age=60');
            response.setHeader('Location', '/');
            response.statusCode = 301;
        }
        response.end();
        status301Index++;
    });
    let status302Index = 0;
    server.get('/302', (_request, response) => {
        if (status302Index === 0) {
            response.setHeader('Cache-Control', 'public, max-age=60');
            response.setHeader('Location', '/');
            response.statusCode = 302;
        }
        response.end();
        status302Index++;
    });
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const A1 = await got('301', { cache });
    const B1 = await got('302', { cache });
    const A2 = await got('301', { cache });
    const B2 = await got('302', { cache });
    t.is(cache.size, 3);
    t.is(A1.body, B1.body);
    t.is(A1.body, A2.body);
    t.is(B1.body, B2.body);
});
ava_1.default('cached response has got options', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const options = {
        username: 'foo',
        cache
    };
    await got(options);
    const secondResponse = await got(options);
    t.is(secondResponse.request.options.username, options.username);
});
ava_1.default('cache error throws `got.CacheError`', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const cache = {};
    // @ts-expect-error Error tests
    await t.throwsAsync(got({ cache }), { instanceOf: got.CacheError });
});
ava_1.default('doesn\'t cache response when received HTTP error', with_server_1.default, async (t, server, got) => {
    let isFirstErrorCalled = false;
    server.get('/', (_request, response) => {
        if (!isFirstErrorCalled) {
            response.end('ok');
            return;
        }
        isFirstErrorCalled = true;
        response.statusCode = 502;
        response.end('received 502');
    });
    const cache = new Map();
    const { statusCode, body } = await got({ url: '', cache, throwHttpErrors: false });
    t.is(statusCode, 200);
    t.is(body, 'ok');
});
ava_1.default('DNS cache works', async (t) => {
    const instance = source_1.default.extend({
        dnsCache: true
    });
    await t.notThrowsAsync(instance('https://example.com'));
    // @ts-expect-error
    t.is(instance.defaults.options.dnsCache._cache.size, 1);
});
ava_1.default('DNS cache works - CacheableLookup instance', async (t) => {
    const cache = new cacheable_lookup_1.default();
    await t.notThrowsAsync(source_1.default('https://example.com', { dnsCache: cache }));
    t.is(cache._cache.size, 1);
});
ava_1.default('`isFromCache` stream property is undefined before the `response` event', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const stream = got.stream({ cache });
    t.is(stream.isFromCache, undefined);
    await getStream(stream);
});
ava_1.default('`isFromCache` stream property is false after the `response` event', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const stream = got.stream({ cache });
    const response = await pEvent(stream, 'response');
    t.is(response.isFromCache, false);
    t.is(stream.isFromCache, false);
    await getStream(stream);
});
ava_1.default('`isFromCache` stream property is true if the response was cached', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    await getStream(got.stream({ cache }));
    const stream = got.stream({ cache });
    const response = await pEvent(stream, 'response');
    t.is(response.isFromCache, true);
    t.is(stream.isFromCache, true);
    await getStream(stream);
});
ava_1.default('can disable cache by extending the instance', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const instance = got.extend({ cache });
    await getStream(instance.stream(''));
    const stream = instance.extend({ cache: false }).stream('');
    const response = await pEvent(stream, 'response');
    t.is(response.isFromCache, false);
    t.is(stream.isFromCache, false);
    await getStream(stream);
});
ava_1.default('does not break POST requests', with_server_1.default, async (t, server, got) => {
    server.post('/', async (request, response) => {
        request.resume();
        response.end(JSON.stringify(request.headers));
    });
    const headers = await got.post('', {
        body: '',
        cache: new Map()
    }).json();
    t.is(headers['content-length'], '0');
});
ava_1.default('decompresses cached responses', with_server_1.default, async (t, server, got) => {
    const etag = 'foobar';
    const payload = JSON.stringify({ foo: 'bar' });
    const compressed = await util_1.promisify(zlib_1.gzip)(payload);
    server.get('/', (request, response) => {
        if (request.headers['if-none-match'] === etag) {
            response.statusCode = 304;
            response.end();
        }
        else {
            response.setHeader('content-encoding', 'gzip');
            response.setHeader('cache-control', 'public, max-age=60');
            response.setHeader('etag', etag);
            response.end(compressed);
        }
    });
    const cache = new Map();
    for (let i = 0; i < 2; i++) {
        // eslint-disable-next-line no-await-in-loop
        await t.notThrowsAsync(got({
            cache,
            responseType: 'json',
            decompress: true,
            retry: 2
        }));
    }
    t.is(cache.size, 1);
});
ava_1.default('can replace the instance\'s HTTP cache', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const secondCache = new Map();
    const instance = got.extend({
        mutableDefaults: true,
        cache
    });
    await t.notThrowsAsync(instance(''));
    await t.notThrowsAsync(instance(''));
    instance.defaults.options.cache = secondCache;
    await t.notThrowsAsync(instance(''));
    await t.notThrowsAsync(instance(''));
    t.is(cache.size, 1);
    t.is(secondCache.size, 1);
});
ava_1.default('does not hang on huge response', with_server_1.default, async (t, server, got) => {
    const bufferSize = 3 * 16 * 1024;
    const times = 10;
    const buffer = Buffer.alloc(bufferSize);
    server.get('/', async (_request, response) => {
        for (let i = 0; i < 10; i++) {
            response.write(buffer);
            // eslint-disable-next-line no-await-in-loop
            await delay(100);
        }
        response.end();
    });
    const body = await got('', {
        cache: new Map()
    }).buffer();
    t.is(body.length, bufferSize * times);
});
ava_1.default('cached response ETag', with_server_1.default, async (t, server, got) => {
    const etag = 'foobar';
    const body = 'responseBody';
    server.get('/', (request, response) => {
        if (request.headers['if-none-match'] === etag) {
            response.writeHead(304);
            response.end();
        }
        else {
            response.writeHead(200, { ETag: etag });
            response.end(body);
        }
    });
    const cache = new Map();
    const originalResponse = await got({ cache });
    t.false(originalResponse.isFromCache);
    t.is(originalResponse.body, body);
    await delay(100); // Added small delay in order to wait the cache to be populated
    t.is(cache.size, 1);
    const cachedResponse = await got({ cache });
    t.true(cachedResponse.isFromCache);
    t.is(cachedResponse.body, body);
});
ava_1.default('works with http2', async (t) => {
    const cache = new Map();
    const client = source_1.default.extend({
        http2: true,
        cache
    });
    await t.notThrowsAsync(client('https://httpbin.org/anything'));
});
ava_1.default('http-cache-semantics typings', t => {
    const instance = source_1.default.extend({
        cacheOptions: {
            shared: false
        }
    });
    t.is(instance.defaults.options.cacheOptions.shared, false);
});
