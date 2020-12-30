"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const ava_1 = require("ava");
const net_1 = require("net");
const nock = require("nock");
const getStream = require("get-stream");
const p_event_1 = require("p-event");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const os = require("os");
const IPv6supported = Object.values(os.networkInterfaces()).some(iface => iface === null || iface === void 0 ? void 0 : iface.some(addr => !addr.internal && addr.family === 'IPv6'));
const testIPv6 = (IPv6supported && process.env.TRAVIS_DIST !== 'bionic' && process.env.TRAVIS_DIST !== 'focal') ? ava_1.default : ava_1.default.skip;
const echoIp = (request, response) => {
    const address = request.connection.remoteAddress;
    if (address === undefined) {
        return response.end();
    }
    // IPv4 address mapped to IPv6
    response.end(address === '::ffff:127.0.0.1' ? '127.0.0.1' : address);
};
const echoBody = async (request, response) => {
    response.end(await getStream(request));
};
ava_1.default('simple request', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    t.is((await got('')).body, 'ok');
});
ava_1.default('empty response', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end();
    });
    t.is((await got('')).body, '');
});
ava_1.default('response has `requestUrl` property', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    server.get('/empty', (_request, response) => {
        response.end();
    });
    t.is((await got('')).requestUrl, `${server.url}/`);
    t.is((await got('empty')).requestUrl, `${server.url}/empty`);
});
ava_1.default('http errors have `response` property', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 404;
        response.end('not');
    });
    const error = await t.throwsAsync(got(''), { instanceOf: source_1.HTTPError });
    t.is(error.response.statusCode, 404);
    t.is(error.response.body, 'not');
});
ava_1.default('status code 304 doesn\'t throw', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 304;
        response.end();
    });
    const promise = got('');
    await t.notThrowsAsync(promise);
    const { statusCode, body } = await promise;
    t.is(statusCode, 304);
    t.is(body, '');
});
ava_1.default('doesn\'t throw if `options.throwHttpErrors` is false', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 404;
        response.end('not');
    });
    t.is((await got({ throwHttpErrors: false })).body, 'not');
});
ava_1.default('invalid protocol throws', async (t) => {
    await t.throwsAsync(source_1.default('c:/nope.com').json(), {
        instanceOf: source_1.UnsupportedProtocolError,
        message: 'Unsupported protocol "c:"'
    });
});
ava_1.default('custom `options.encoding`', with_server_1.default, async (t, server, got) => {
    const string = 'ok';
    server.get('/', (_request, response) => {
        response.end(string);
    });
    const data = (await got({ encoding: 'base64' })).body;
    t.is(data, Buffer.from(string).toString('base64'));
});
ava_1.default('`options.encoding` doesn\'t affect streams', with_server_1.default, async (t, server, got) => {
    const string = 'ok';
    server.get('/', (_request, response) => {
        response.end(string);
    });
    const data = await getStream(got.stream({ encoding: 'base64' }));
    t.is(data, string);
});
ava_1.default('`got.stream(...).setEncoding(...)` works', with_server_1.default, async (t, server, got) => {
    const string = 'ok';
    server.get('/', (_request, response) => {
        response.end(string);
    });
    const data = await getStream(got.stream('').setEncoding('base64'));
    t.is(data, Buffer.from(string).toString('base64'));
});
ava_1.default('`searchParams` option', with_server_1.default, async (t, server, got) => {
    server.get('/', (request, response) => {
        t.is(request.query.recent, 'true');
        response.end('recent');
    });
    t.is((await got({ searchParams: { recent: true } })).body, 'recent');
    t.is((await got({ searchParams: 'recent=true' })).body, 'recent');
});
ava_1.default('response contains url', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    t.is((await got('')).url, `${server.url}/`);
});
ava_1.default('response contains got options', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    {
        const options = {
            username: 'foo',
            password: 'bar'
        };
        const { options: normalizedOptions } = (await got(options)).request;
        t.is(normalizedOptions.username, options.username);
        t.is(normalizedOptions.password, options.password);
    }
    {
        const options = {
            username: 'foo'
        };
        const { options: normalizedOptions } = (await got(options)).request;
        t.is(normalizedOptions.username, options.username);
        t.is(normalizedOptions.password, '');
    }
    {
        const options = {
            password: 'bar'
        };
        const { options: normalizedOptions } = (await got(options)).request;
        t.is(normalizedOptions.username, '');
        t.is(normalizedOptions.password, options.password);
    }
});
ava_1.default('socket destroyed by the server throws ECONNRESET', with_server_1.default, async (t, server, got) => {
    server.get('/', request => {
        request.socket.destroy();
    });
    await t.throwsAsync(got('', { retry: 0 }), {
        code: 'ECONNRESET'
    });
});
ava_1.default('the response contains timings property', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const { timings } = await got('');
    t.truthy(timings);
    t.true(timings.phases.total >= 0);
});
ava_1.default('throws an error if the server aborted the request', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.writeHead(200, {
            'content-type': 'text/plain'
        });
        response.write('chunk 1');
        setImmediate(() => {
            response.write('chunk 2');
            setImmediate(() => {
                response.destroy();
            });
        });
    });
    const error = await t.throwsAsync(got(''), {
        message: 'The server aborted pending request'
    });
    t.truthy(error.response.retryCount);
});
ava_1.default('statusMessage fallback', async (t) => {
    nock('http://statusMessageFallback').get('/').reply(503);
    const { statusMessage } = await source_1.default('http://statusMessageFallback', {
        throwHttpErrors: false,
        retry: 0
    });
    t.is(statusMessage, http_1.STATUS_CODES[503]);
});
ava_1.default('does not destroy completed requests', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('content-encoding', 'gzip');
        response.end('');
    });
    const options = {
        agent: {
            http: new http_1.Agent({ keepAlive: true })
        },
        retry: 0
    };
    const stream = got.stream(options);
    stream.resume();
    const endPromise = p_event_1.default(stream, 'end');
    const socket = await p_event_1.default(stream, 'socket');
    const closeListener = () => {
        t.fail('Socket has been destroyed');
    };
    socket.once('close', closeListener);
    await new Promise(resolve => {
        setTimeout(resolve, 10);
    });
    socket.off('close', closeListener);
    await endPromise;
    options.agent.http.destroy();
    t.pass();
});
testIPv6('IPv6 request', with_server_1.default, async (t, server) => {
    server.get('/ok', echoIp);
    const response = await source_1.default(`http://[::1]:${server.port}/ok`);
    t.is(response.body, '::1');
});
ava_1.default('DNS auto', with_server_1.default, async (t, server, got) => {
    server.get('/ok', echoIp);
    const response = await got('ok', {
        dnsLookupIpVersion: 'auto'
    });
    t.true(net_1.isIPv4(response.body));
});
ava_1.default('DNS IPv4', with_server_1.default, async (t, server, got) => {
    server.get('/ok', echoIp);
    const response = await got('ok', {
        dnsLookupIpVersion: 'ipv4'
    });
    t.true(net_1.isIPv4(response.body));
});
// Travis CI Ubuntu Focal VM does not resolve IPv6 hostnames
testIPv6('DNS IPv6', with_server_1.default, async (t, server, got) => {
    server.get('/ok', echoIp);
    const response = await got('ok', {
        dnsLookupIpVersion: 'ipv6'
    });
    t.true(net_1.isIPv6(response.body));
});
ava_1.default('invalid `dnsLookupIpVersion`', with_server_1.default, async (t, server, got) => {
    server.get('/ok', echoIp);
    await t.throwsAsync(got('ok', {
        dnsLookupIpVersion: 'test'
    }));
});
ava_1.default.serial('deprecated `family` option', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    await new Promise(resolve => {
        let request;
        (async () => {
            const warning = await p_event_1.default(process, 'warning');
            t.is(warning.name, 'DeprecationWarning');
            request.cancel();
            resolve();
        })();
        (async () => {
            request = got({
                family: '4'
            });
            try {
                await request;
                t.fail();
            }
            catch (_a) {
                t.true(request.isCanceled);
            }
            resolve();
        })();
    });
});
ava_1.default('JSON request custom stringifier', with_server_1.default, async (t, server, got) => {
    server.post('/', echoBody);
    const payload = { a: 'b' };
    const customStringify = (object) => JSON.stringify({ ...object, c: 'd' });
    t.deepEqual((await got.post({
        stringifyJson: customStringify,
        json: payload
    })).body, customStringify(payload));
});
