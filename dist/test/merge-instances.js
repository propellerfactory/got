"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const echoHeaders = (request, response) => {
    response.end(JSON.stringify(request.headers));
};
ava_1.default('merging instances', with_server_1.default, async (t, server) => {
    server.get('/', echoHeaders);
    const instanceA = source_1.default.extend({ headers: { unicorn: 'rainbow' } });
    const instanceB = source_1.default.extend({ prefixUrl: server.url });
    const merged = instanceA.extend(instanceB);
    const headers = await merged('').json();
    t.is(headers.unicorn, 'rainbow');
    t.not(headers['user-agent'], undefined);
});
ava_1.default('merges default handlers & custom handlers', with_server_1.default, async (t, server) => {
    server.get('/', echoHeaders);
    const instanceA = source_1.default.extend({ headers: { unicorn: 'rainbow' } });
    const instanceB = source_1.default.extend({
        handlers: [
            (options, next) => {
                options.headers.cat = 'meow';
                return next(options);
            }
        ]
    });
    const merged = instanceA.extend(instanceB);
    const headers = await merged(server.url).json();
    t.is(headers.unicorn, 'rainbow');
    t.is(headers.cat, 'meow');
});
ava_1.default('merging one group & one instance', with_server_1.default, async (t, server) => {
    server.get('/', echoHeaders);
    const instanceA = source_1.default.extend({ headers: { dog: 'woof' } });
    const instanceB = source_1.default.extend({ headers: { cat: 'meow' } });
    const instanceC = source_1.default.extend({ headers: { bird: 'tweet' } });
    const instanceD = source_1.default.extend({ headers: { mouse: 'squeek' } });
    const merged = instanceA.extend(instanceB, instanceC);
    const doubleMerged = merged.extend(instanceD);
    const headers = await doubleMerged(server.url).json();
    t.is(headers.dog, 'woof');
    t.is(headers.cat, 'meow');
    t.is(headers.bird, 'tweet');
    t.is(headers.mouse, 'squeek');
});
ava_1.default('merging two groups of merged instances', with_server_1.default, async (t, server) => {
    server.get('/', echoHeaders);
    const instanceA = source_1.default.extend({ headers: { dog: 'woof' } });
    const instanceB = source_1.default.extend({ headers: { cat: 'meow' } });
    const instanceC = source_1.default.extend({ headers: { bird: 'tweet' } });
    const instanceD = source_1.default.extend({ headers: { mouse: 'squeek' } });
    const groupA = instanceA.extend(instanceB);
    const groupB = instanceC.extend(instanceD);
    const merged = groupA.extend(groupB);
    const headers = await merged(server.url).json();
    t.is(headers.dog, 'woof');
    t.is(headers.cat, 'meow');
    t.is(headers.bird, 'tweet');
    t.is(headers.mouse, 'squeek');
});
ava_1.default('hooks are merged', t => {
    const getBeforeRequestHooks = (instance) => instance.defaults.options.hooks.beforeRequest;
    const instanceA = source_1.default.extend({ hooks: {
            beforeRequest: [
                options => {
                    options.headers.dog = 'woof';
                }
            ]
        } });
    const instanceB = source_1.default.extend({ hooks: {
            beforeRequest: [
                options => {
                    options.headers.cat = 'meow';
                }
            ]
        } });
    const merged = instanceA.extend(instanceB);
    t.deepEqual(getBeforeRequestHooks(merged), getBeforeRequestHooks(instanceA).concat(getBeforeRequestHooks(instanceB)));
});
ava_1.default('default handlers are not duplicated', t => {
    const instance = source_1.default.extend(source_1.default);
    t.is(instance.defaults.handlers.length, 1);
});
ava_1.default('URL is not polluted', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    await got({
        username: 'foo'
    });
    const { options: normalizedOptions } = (await got({})).request;
    t.is(normalizedOptions.username, '');
});
ava_1.default('merging instances with HTTPS options', t => {
    var _a, _b;
    const instanceA = source_1.default.extend({ https: {
            rejectUnauthorized: true,
            certificate: 'FIRST'
        } });
    const instanceB = source_1.default.extend({ https: {
            certificate: 'SECOND'
        } });
    const merged = instanceA.extend(instanceB);
    t.true((_a = merged.defaults.options.https) === null || _a === void 0 ? void 0 : _a.rejectUnauthorized);
    t.is((_b = merged.defaults.options.https) === null || _b === void 0 ? void 0 : _b.certificate, 'SECOND');
});
ava_1.default('merging instances with HTTPS options undefined', t => {
    var _a, _b;
    const instanceA = source_1.default.extend({ https: {
            rejectUnauthorized: true,
            certificate: 'FIRST'
        } });
    const instanceB = source_1.default.extend({ https: {
            certificate: undefined
        } });
    const merged = instanceA.extend(instanceB);
    t.true((_a = merged.defaults.options.https) === null || _a === void 0 ? void 0 : _a.rejectUnauthorized);
    t.is((_b = merged.defaults.options.https) === null || _b === void 0 ? void 0 : _b.certificate, undefined);
});
ava_1.default('accepts options for promise API', t => {
    source_1.default.extend({
        hooks: {
            beforeRequest: [
                (options) => {
                    options.responseType = 'buffer';
                }
            ]
        }
    });
    t.pass();
});
ava_1.default('merging `prefixUrl`', t => {
    const prefixUrl = 'http://example.com/';
    const instanceA = source_1.default.extend({ headers: { unicorn: 'rainbow' } });
    const instanceB = source_1.default.extend({ prefixUrl });
    const mergedAonB = instanceB.extend(instanceA);
    const mergedBonA = instanceA.extend(instanceB);
    t.is(mergedAonB.defaults.options.prefixUrl, '');
    t.is(mergedBonA.defaults.options.prefixUrl, prefixUrl);
    t.is(instanceB.extend({}).defaults.options.prefixUrl, prefixUrl);
    t.is(instanceB.extend({ prefixUrl: undefined }).defaults.options.prefixUrl, prefixUrl);
});
