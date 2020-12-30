"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable node/no-deprecated-api */
const url_1 = require("url");
const ava_1 = require("ava");
const pEvent = require("p-event");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const echoUrl = (request, response) => {
    response.end(request.url);
};
ava_1.default('`url` is required', async (t) => {
    await t.throwsAsync(
    // @ts-expect-error No argument on purpose.
    source_1.default(), {
        message: 'Missing `url` property'
    });
    await t.throwsAsync(source_1.default(''), {
        message: 'No URL protocol specified'
    });
    await t.throwsAsync(source_1.default({
        url: ''
    }), {
        message: 'No URL protocol specified'
    });
});
ava_1.default('`url` should be utf-8 encoded', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com/%D2%E0%EB%EB%E8%ED'), {
        message: 'URI malformed'
    });
});
ava_1.default('throws if no arguments provided', async (t) => {
    // @ts-expect-error Error tests
    await t.throwsAsync(source_1.default(), {
        message: 'Missing `url` property'
    });
});
ava_1.default('throws an error if the protocol is not specified', async (t) => {
    await t.throwsAsync(source_1.default('example.com'), {
        instanceOf: TypeError,
        message: 'Invalid URL: example.com'
    });
    await t.throwsAsync(source_1.default({}), {
        message: 'Missing `url` property'
    });
});
ava_1.default('properly encodes query string', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const path = '?test=http://example.com?foo=bar';
    const { body } = await got(path);
    t.is(body, '/?test=http://example.com?foo=bar');
});
ava_1.default('options are optional', with_server_1.default, async (t, server, got) => {
    server.get('/test', echoUrl);
    t.is((await got('test')).body, '/test');
});
ava_1.default('methods are normalized', with_server_1.default, async (t, server, got) => {
    server.post('/test', echoUrl);
    const instance = got.extend({
        handlers: [
            (options, next) => {
                if (options.method === options.method.toUpperCase()) {
                    t.pass();
                }
                else {
                    t.fail();
                }
                return next(options);
            }
        ]
    });
    await instance('test', { method: 'post' });
});
ava_1.default.failing('throws an error when legacy URL is passed', with_server_1.default, async (t, server) => {
    server.get('/test', echoUrl);
    await t.throwsAsync(
    // @ts-expect-error Error tests
    source_1.default(url_1.parse(`${server.url}/test`)), { message: 'The legacy `url.Url` has been deprecated. Use `URL` instead.' });
    await t.throwsAsync(source_1.default({
        protocol: 'http:',
        hostname: 'localhost',
        port: server.port
    }), { message: 'The legacy `url.Url` has been deprecated. Use `URL` instead.' });
});
ava_1.default('accepts legacy URL options', with_server_1.default, async (t, server) => {
    server.get('/test', echoUrl);
    const { body: secondBody } = await source_1.default({
        protocol: 'http:',
        hostname: 'localhost',
        port: server.port,
        pathname: '/test'
    });
    t.is(secondBody, '/test');
});
ava_1.default('overrides `searchParams` from options', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const { body } = await got('?drop=this', {
        searchParams: {
            test: 'wow'
        }
    });
    t.is(body, '/?test=wow');
});
ava_1.default('does not duplicate `searchParams`', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const instance = got.extend({
        searchParams: new url_1.URLSearchParams({ foo: '123' })
    });
    const body = await instance('?bar=456').text();
    t.is(body, '/?foo=123');
});
ava_1.default('escapes `searchParams` parameter values', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const { body } = await got({
        searchParams: {
            test: 'it’s ok'
        }
    });
    t.is(body, '/?test=it%E2%80%99s+ok');
});
ava_1.default('the `searchParams` option can be a URLSearchParams', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const searchParameters = new url_1.URLSearchParams({ test: 'wow' });
    const { body } = await got({ searchParams: searchParameters });
    t.is(body, '/?test=wow');
});
ava_1.default('ignores empty searchParams object', with_server_1.default, async (t, server, got) => {
    server.get('/test', echoUrl);
    t.is((await got('test', { searchParams: {} })).requestUrl, `${server.url}/test`);
});
ava_1.default('throws when passing body with a non payload method', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', { body: 'asdf' }), {
        message: 'The `GET` method cannot be used with a body'
    });
});
ava_1.default('`allowGetBody` option', with_server_1.default, async (t, server, got) => {
    server.get('/test', echoUrl);
    const url = new url_1.URL(`${server.url}/test`);
    await t.notThrowsAsync(got(url, { body: 'asdf', allowGetBody: true }));
});
ava_1.default('WHATWG URL support', with_server_1.default, async (t, server, got) => {
    server.get('/test', echoUrl);
    const url = new url_1.URL(`${server.url}/test`);
    await t.notThrowsAsync(got(url));
});
ava_1.default('returns streams when using `isStream` option', with_server_1.default, async (t, server, got) => {
    server.get('/stream', (_request, response) => {
        response.end('ok');
    });
    const data = await pEvent(got('stream', { isStream: true }), 'data');
    t.is(data.toString(), 'ok');
});
ava_1.default('accepts `url` as an option', with_server_1.default, async (t, server, got) => {
    server.get('/test', echoUrl);
    await t.notThrowsAsync(got({ url: 'test' }));
});
ava_1.default('can omit `url` option if using `prefixUrl`', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    await t.notThrowsAsync(got({}));
});
ava_1.default('throws TypeError when `options.hooks` is not an object', async (t) => {
    await t.throwsAsync(
    // @ts-expect-error Error tests
    source_1.default('https://example.com', { hooks: 'not object' }), {
        message: 'Expected value which is `predicate returns truthy for any value`, received value of type `Array`.'
    });
});
ava_1.default('throws TypeError when known `options.hooks` value is not an array', async (t) => {
    await t.throwsAsync(
    // @ts-expect-error Error tests
    source_1.default('https://example.com', { hooks: { beforeRequest: {} } }), {
        message: 'Parameter `beforeRequest` must be an Array, got Object'
    });
});
ava_1.default('throws TypeError when known `options.hooks` array item is not a function', async (t) => {
    await t.throwsAsync(
    // @ts-expect-error Error tests
    source_1.default('https://example.com', { hooks: { beforeRequest: [{}] } }), {
        message: 'hook is not a function'
    });
});
ava_1.default('allows extra keys in `options.hooks`', with_server_1.default, async (t, server, got) => {
    server.get('/test', echoUrl);
    // @ts-expect-error We do not allow extra keys in hooks but this won't throw
    await t.notThrowsAsync(got('test', { hooks: { extra: [] } }));
});
ava_1.default('`prefixUrl` option works', with_server_1.default, async (t, server, got) => {
    server.get('/test/foobar', echoUrl);
    const instanceA = got.extend({ prefixUrl: `${server.url}/test` });
    const { body } = await instanceA('foobar');
    t.is(body, '/test/foobar');
});
ava_1.default('accepts WHATWG URL as the `prefixUrl` option', with_server_1.default, async (t, server, got) => {
    server.get('/test/foobar', echoUrl);
    const instanceA = got.extend({ prefixUrl: new url_1.URL(`${server.url}/test`) });
    const { body } = await instanceA('foobar');
    t.is(body, '/test/foobar');
});
ava_1.default('backslash in the end of `prefixUrl` option is optional', with_server_1.default, async (t, server) => {
    server.get('/test/foobar', echoUrl);
    const instanceA = source_1.default.extend({ prefixUrl: `${server.url}/test/` });
    const { body } = await instanceA('foobar');
    t.is(body, '/test/foobar');
});
ava_1.default('`prefixUrl` can be changed if the URL contains the old one', with_server_1.default, async (t, server) => {
    server.get('/', echoUrl);
    const instanceA = source_1.default.extend({
        prefixUrl: `${server.url}/meh`,
        handlers: [
            (options, next) => {
                options.prefixUrl = server.url;
                return next(options);
            }
        ]
    });
    const { body } = await instanceA('');
    t.is(body, '/');
});
ava_1.default('throws if cannot change `prefixUrl`', async (t) => {
    const instanceA = source_1.default.extend({
        prefixUrl: 'https://example.com',
        handlers: [
            (options, next) => {
                options.url = new url_1.URL('https://google.pl');
                options.prefixUrl = 'https://example.com';
                return next(options);
            }
        ]
    });
    await t.throwsAsync(instanceA(''), { message: 'Cannot change `prefixUrl` from https://example.com/ to https://example.com: https://google.pl/' });
});
ava_1.default('throws if the `searchParams` value is invalid', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        searchParams: {
            // @ts-expect-error Error tests
            foo: []
        }
    }), {
        instanceOf: TypeError,
        message: 'The `searchParams` value \'\' must be a string, number, boolean or null'
    });
});
ava_1.default('`context` option is enumerable', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const context = {
        foo: 'bar'
    };
    await got({
        context,
        hooks: {
            beforeRequest: [
                options => {
                    t.deepEqual(options.context, context);
                    t.true({}.propertyIsEnumerable.call(options, 'context'));
                }
            ]
        }
    });
});
ava_1.default('`context` option is accessible when using hooks', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const context = {
        foo: 'bar'
    };
    await got({
        context,
        hooks: {
            beforeRequest: [
                options => {
                    t.deepEqual(options.context, context);
                    t.true({}.propertyIsEnumerable.call(options, 'context'));
                }
            ]
        }
    });
});
ava_1.default('`context` option is accessible when extending instances', t => {
    const context = {
        foo: 'bar'
    };
    const instance = source_1.default.extend({ context });
    t.deepEqual(instance.defaults.options.context, context);
    t.true({}.propertyIsEnumerable.call(instance.defaults.options, 'context'));
});
ava_1.default('`context` option is shallow merged', t => {
    const context = {
        foo: 'bar'
    };
    const context2 = {
        bar: 'baz'
    };
    const instance1 = source_1.default.extend({ context });
    t.deepEqual(instance1.defaults.options.context, context);
    t.true({}.propertyIsEnumerable.call(instance1.defaults.options, 'context'));
    const instance2 = instance1.extend({ context: context2 });
    t.deepEqual(instance2.defaults.options.context, { ...context, ...context2 });
});
ava_1.default('throws if `options.encoding` is `null`', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        // @ts-expect-error For testing purposes
        encoding: null
    }), { message: 'To get a Buffer, set `options.responseType` to `buffer` instead' });
});
ava_1.default('`url` option and input argument are mutually exclusive', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        url: 'https://example.com'
    }), { message: 'The `url` option is mutually exclusive with the `input` argument' });
});
ava_1.default('throws a helpful error when passing `followRedirects`', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        // @ts-expect-error For testing purposes
        followRedirects: true
    }), { message: 'The `followRedirects` option does not exist. Use `followRedirect` instead.' });
});
ava_1.default('merges `searchParams` instances', t => {
    const instance = source_1.default.extend({
        searchParams: new url_1.URLSearchParams('a=1')
    }, {
        searchParams: new url_1.URLSearchParams('b=2')
    });
    t.is(instance.defaults.options.searchParams.get('a'), '1');
    t.is(instance.defaults.options.searchParams.get('b'), '2');
});
ava_1.default('throws a helpful error when passing `auth`', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        // @ts-expect-error For testing purposes
        auth: 'username:password'
    }), {
        message: 'Parameter `auth` is deprecated. Use `username` / `password` instead.'
    });
});
ava_1.default('throws on leading slashes', async (t) => {
    await t.throwsAsync(source_1.default('/asdf', { prefixUrl: 'https://example.com' }), {
        message: '`input` must not start with a slash when using `prefixUrl`'
    });
});
ava_1.default('throws on invalid `dnsCache` option', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        // @ts-expect-error Error tests
        dnsCache: 123
    }), { message: 'Parameter `dnsCache` must be a CacheableLookup instance or a boolean, got number' });
});
ava_1.default('throws on invalid `agent` option', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        agent: {
            // @ts-expect-error Error tests
            asdf: 123
        }
    }), { message: 'Expected the `options.agent` properties to be `http`, `https` or `http2`, got `asdf`' });
});
ava_1.default('fallbacks to native http if `request(...)` returns undefined', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const { body } = await got('', { request: () => undefined });
    t.is(body, '/');
});
ava_1.default('strict options', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const options = {};
    const { body } = await got(options);
    t.is(body, '/');
});
ava_1.default('does not throw on frozen options', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const options = {};
    Object.freeze(options);
    const { body } = await got(options);
    t.is(body, '/');
});
ava_1.default('encodes query string included in input', t => {
    const { url } = source_1.default.mergeOptions({
        url: new url_1.URL('https://example.com/?a=b c')
    });
    t.is(url.search, '?a=b%20c');
});
ava_1.default('normalizes search params included in options', t => {
    const { url } = source_1.default.mergeOptions({
        url: new url_1.URL('https://example.com'),
        searchParams: 'a=b c'
    });
    t.is(url.search, '?a=b+c');
});
ava_1.default('reuse options while using init hook', with_server_1.default, async (t, server, got) => {
    t.plan(2);
    server.get('/', echoUrl);
    const options = {
        hooks: {
            init: [
                () => {
                    t.pass();
                }
            ]
        }
    };
    await got('', options);
    await got('', options);
});
ava_1.default('allowGetBody sends json payload', with_server_1.withBodyParsingServer, async (t, server, got) => {
    server.get('/', (request, response) => {
        if (request.body.hello !== 'world') {
            response.statusCode = 400;
        }
        response.end();
    });
    const { statusCode } = await got({
        allowGetBody: true,
        json: { hello: 'world' },
        retry: 0,
        throwHttpErrors: false
    });
    t.is(statusCode, 200);
});
ava_1.default('no URL pollution', with_server_1.default, async (t, server) => {
    server.get('/ok', echoUrl);
    const url = new url_1.URL(server.url);
    const { body } = await source_1.default(url, {
        hooks: {
            beforeRequest: [
                options => {
                    options.url.pathname = '/ok';
                }
            ]
        }
    });
    t.is(url.pathname, '/');
    t.is(body, '/ok');
});
ava_1.default('prefixUrl is properly replaced when extending', with_server_1.default, async (t, server) => {
    server.get('/', (request, response) => {
        response.end(request.url);
    });
    server.get('/other/path/', (request, response) => {
        response.end(request.url);
    });
    const parent = source_1.default.extend({ prefixUrl: server.url });
    const child = parent.extend({ prefixUrl: `${server.url}/other/path/` });
    t.is(await child.get('').text(), '/other/path/');
});
