"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const url_1 = require("url");
const ava_1 = require("ava");
const is_1 = require("@sindresorhus/is");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const echoHeaders = (request, response) => {
    request.resume();
    response.end(JSON.stringify(request.headers));
};
ava_1.default('preserves global defaults', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const globalHeaders = await got('').json();
    const instanceHeaders = await got.extend()('').json();
    t.deepEqual(instanceHeaders, globalHeaders);
});
ava_1.default('supports instance defaults', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const instance = got.extend({
        headers: {
            'user-agent': 'custom-ua-string'
        }
    });
    const headers = await instance('').json();
    t.is(headers['user-agent'], 'custom-ua-string');
});
ava_1.default('supports invocation overrides', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const instance = got.extend({
        headers: {
            'user-agent': 'custom-ua-string'
        }
    });
    const headers = await instance({
        headers: {
            'user-agent': 'different-ua-string'
        }
    }).json();
    t.is(headers['user-agent'], 'different-ua-string');
});
ava_1.default('carries previous instance defaults', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const instanceA = got.extend({
        headers: {
            'x-foo': 'foo'
        }
    });
    const instanceB = instanceA.extend({
        headers: {
            'x-bar': 'bar'
        }
    });
    const headers = await instanceB('').json();
    t.is(headers['x-foo'], 'foo');
    t.is(headers['x-bar'], 'bar');
});
ava_1.default('custom headers (extend)', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const options = { headers: { unicorn: 'rainbow' } };
    const instance = got.extend(options);
    const headers = await instance('').json();
    t.is(headers.unicorn, 'rainbow');
});
ava_1.default('extend overwrites arrays with a deep clone', t => {
    const beforeRequest = [0];
    const a = source_1.default.extend({ hooks: { beforeRequest } });
    beforeRequest[0] = 1;
    t.deepEqual(a.defaults.options.hooks.beforeRequest, [0]);
    t.not(a.defaults.options.hooks.beforeRequest, beforeRequest);
});
ava_1.default('extend keeps the old value if the new one is undefined', t => {
    const a = source_1.default.extend({ headers: undefined });
    t.deepEqual(a.defaults.options.headers, source_1.default.defaults.options.headers);
});
ava_1.default('hooks are merged on got.extend()', t => {
    const hooksA = [() => { }];
    const hooksB = [() => { }];
    const instanceA = source_1.default.extend({ hooks: { beforeRequest: hooksA } });
    const extended = instanceA.extend({ hooks: { beforeRequest: hooksB } });
    t.deepEqual(extended.defaults.options.hooks.beforeRequest, hooksA.concat(hooksB));
});
ava_1.default('custom endpoint with custom headers (extend)', with_server_1.default, async (t, server) => {
    server.all('/', echoHeaders);
    const instance = source_1.default.extend({ headers: { unicorn: 'rainbow' }, prefixUrl: server.url });
    const headers = await instance('').json();
    t.is(headers.unicorn, 'rainbow');
    t.not(headers['user-agent'], undefined);
});
ava_1.default('no tampering with defaults', t => {
    t.throws(() => {
        source_1.default.defaults.options.prefixUrl = 'http://google.com';
    });
    t.is(source_1.default.defaults.options.prefixUrl, '');
});
ava_1.default('can set defaults to `got.mergeOptions(...)`', t => {
    const instance = source_1.default.extend({
        mutableDefaults: true,
        followRedirect: false
    });
    t.notThrows(() => {
        instance.defaults.options = source_1.default.mergeOptions(instance.defaults.options, {
            followRedirect: true
        });
    });
    t.true(instance.defaults.options.followRedirect);
    t.notThrows(() => {
        instance.defaults.options = source_1.default.mergeOptions({});
    });
    t.is(instance.defaults.options.followRedirect, undefined);
});
ava_1.default('can set mutable defaults using got.extend', t => {
    const instance = source_1.default.extend({
        mutableDefaults: true,
        followRedirect: false
    });
    t.notThrows(() => {
        instance.defaults.options.followRedirect = true;
    });
    t.true(instance.defaults.options.followRedirect);
});
ava_1.default('only plain objects are freezed', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const instance = got.extend({
        agent: {
            http: new http_1.Agent({ keepAlive: true })
        },
        mutableDefaults: true
    });
    t.notThrows(() => {
        instance.defaults.options.agent.http.keepAlive = true;
    });
});
ava_1.default('defaults are cloned on instance creation', t => {
    const options = { foo: 'bar', hooks: { beforeRequest: [() => { }] } };
    const instance = source_1.default.extend(options);
    t.notThrows(() => {
        options.foo = 'foo';
        delete options.hooks.beforeRequest[0];
    });
    // @ts-expect-error This IS correct
    t.not(options.foo, instance.defaults.options.foo);
    t.not(options.hooks.beforeRequest, instance.defaults.options.hooks.beforeRequest);
});
ava_1.default('ability to pass a custom request method', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    let isCalled = false;
    const request = (...args) => {
        isCalled = true;
        // @ts-expect-error Overload error
        return http_1.request(...args);
    };
    const instance = got.extend({ request });
    await instance('');
    t.true(isCalled);
});
ava_1.default('does not include the `request` option in normalized `http` options', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    let isCalled = false;
    const request = (...args) => {
        isCalled = true;
        t.false(Reflect.has(args[0], 'request'));
        // @ts-expect-error Overload error
        return http_1.request(...args);
    };
    const instance = got.extend({ request });
    await instance('');
    t.true(isCalled);
});
ava_1.default('should pass an options object into an initialization hook after .extend', with_server_1.default, async (t, server, got) => {
    t.plan(1);
    server.get('/', echoHeaders);
    const instance = got.extend({
        hooks: {
            init: [
                options => {
                    t.deepEqual(options, {});
                }
            ]
        }
    });
    await instance('');
});
ava_1.default('hooks aren\'t overriden when merging options', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    let isCalled = false;
    const instance = got.extend({
        hooks: {
            beforeRequest: [
                () => {
                    isCalled = true;
                }
            ]
        }
    });
    await instance({});
    t.true(isCalled);
});
ava_1.default('extend with custom handlers', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const instance = got.extend({
        handlers: [
            (options, next) => {
                options.headers.unicorn = 'rainbow';
                return next(options);
            }
        ]
    });
    const headers = await instance('').json();
    t.is(headers.unicorn, 'rainbow');
});
ava_1.default('extend with instances', t => {
    const a = source_1.default.extend({ prefixUrl: new url_1.URL('https://example.com/') });
    const b = source_1.default.extend(a);
    t.is(b.defaults.options.prefixUrl.toString(), 'https://example.com/');
});
ava_1.default('extend with a chain', t => {
    const a = source_1.default.extend({ prefixUrl: 'https://example.com/' });
    const b = source_1.default.extend(a, { headers: { foo: 'bar' } });
    t.is(b.defaults.options.prefixUrl.toString(), 'https://example.com/');
    t.is(b.defaults.options.headers.foo, 'bar');
});
ava_1.default('async handlers', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const instance = got.extend({
        handlers: [
            async (options, next) => {
                const result = await next(options);
                // @ts-expect-error Manual tests
                result.modified = true;
                return result;
            }
        ]
    });
    const promise = instance('');
    t.true(is_1.default.function_(promise.cancel));
    // @ts-expect-error Manual tests
    t.true((await promise).modified);
});
ava_1.default('async handlers can throw', async (t) => {
    const message = 'meh';
    const instance = source_1.default.extend({
        handlers: [
            async () => {
                throw new Error(message);
            }
        ]
    });
    await t.throwsAsync(instance('https://example.com'), { message });
});
ava_1.default('setting dnsCache to true points to global cache', t => {
    const a = source_1.default.extend({
        dnsCache: true
    });
    const b = source_1.default.extend({
        dnsCache: true
    });
    t.is(a.defaults.options.dnsCache, b.defaults.options.dnsCache);
});
