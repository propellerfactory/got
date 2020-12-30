"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const ava_1 = require("ava");
const toughCookie = require("tough-cookie");
const delay = require("delay");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
ava_1.default('reads a cookie', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('set-cookie', 'hello=world');
        response.end();
    });
    const cookieJar = new toughCookie.CookieJar();
    await got({ cookieJar });
    const cookie = cookieJar.getCookiesSync(server.url)[0];
    t.is(cookie.key, 'hello');
    t.is(cookie.value, 'world');
});
ava_1.default('reads multiple cookies', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('set-cookie', ['hello=world', 'foo=bar']);
        response.end();
    });
    const cookieJar = new toughCookie.CookieJar();
    await got({ cookieJar });
    const [cookieA, cookieB] = cookieJar.getCookiesSync(server.url);
    t.is(cookieA.key, 'hello');
    t.is(cookieA.value, 'world');
    t.is(cookieB.key, 'foo');
    t.is(cookieB.value, 'bar');
});
ava_1.default('cookies doesn\'t break on redirects', with_server_1.default, async (t, server, got) => {
    server.get('/redirect', (_request, response) => {
        response.setHeader('set-cookie', ['hello=world', 'foo=bar']);
        response.setHeader('location', '/');
        response.statusCode = 302;
        response.end();
    });
    server.get('/', (request, response) => {
        var _a;
        response.end((_a = request.headers.cookie) !== null && _a !== void 0 ? _a : '');
    });
    const cookieJar = new toughCookie.CookieJar();
    const { body } = await got('redirect', { cookieJar });
    t.is(body, 'hello=world; foo=bar');
});
ava_1.default('throws on invalid cookies', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('set-cookie', 'hello=world; domain=localhost');
        response.end();
    });
    const cookieJar = new toughCookie.CookieJar();
    await t.throwsAsync(got({ cookieJar }), { message: 'Cookie has domain set to a public suffix' });
});
ava_1.default('does not throw on invalid cookies when options.ignoreInvalidCookies is set', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('set-cookie', 'hello=world; domain=localhost');
        response.end();
    });
    const cookieJar = new toughCookie.CookieJar();
    await got({
        cookieJar,
        ignoreInvalidCookies: true
    });
    const cookies = cookieJar.getCookiesSync(server.url);
    t.is(cookies.length, 0);
});
ava_1.default('catches store errors', async (t) => {
    const error = 'Some error';
    const cookieJar = new toughCookie.CookieJar({
        findCookies: (_, __, ___, callback) => {
            callback(new Error(error), []);
        },
        findCookie: () => { },
        getAllCookies: () => { },
        putCookie: () => { },
        removeCookies: () => { },
        removeCookie: () => { },
        updateCookie: () => { },
        synchronous: false
    });
    await t.throwsAsync(source_1.default('https://example.com', { cookieJar }), { message: error });
});
ava_1.default('overrides options.headers.cookie', with_server_1.default, async (t, server, got) => {
    server.get('/redirect', (_request, response) => {
        response.setHeader('set-cookie', ['hello=world', 'foo=bar']);
        response.setHeader('location', '/');
        response.statusCode = 302;
        response.end();
    });
    server.get('/', (request, response) => {
        var _a;
        response.end((_a = request.headers.cookie) !== null && _a !== void 0 ? _a : '');
    });
    const cookieJar = new toughCookie.CookieJar();
    const { body } = await got('redirect', {
        cookieJar,
        headers: {
            cookie: 'a=b'
        }
    });
    t.is(body, 'hello=world; foo=bar');
});
ava_1.default('no unhandled errors', async (t) => {
    const server = net.createServer(connection => {
        connection.end('blah');
    }).listen(0);
    const message = 'snap!';
    const options = {
        cookieJar: {
            setCookie: async (_rawCookie, _url) => { },
            getCookieString: async (_url) => {
                throw new Error(message);
            }
        }
    };
    await t.throwsAsync(source_1.default(`http://127.0.0.1:${server.address().port}`, options), { message });
    await delay(500);
    t.pass();
    server.close();
});
ava_1.default('accepts custom `cookieJar` object', with_server_1.default, async (t, server, got) => {
    server.get('/', (request, response) => {
        response.setHeader('set-cookie', ['hello=world']);
        response.end(request.headers.cookie);
    });
    const cookies = {};
    const cookieJar = {
        async getCookieString(url) {
            var _a;
            t.is(typeof url, 'string');
            return (_a = cookies[url]) !== null && _a !== void 0 ? _a : '';
        },
        async setCookie(rawCookie, url) {
            cookies[url] = rawCookie;
        }
    };
    const first = await got('', { cookieJar });
    const second = await got('', { cookieJar });
    t.is(first.body, '');
    t.is(second.body, 'hello=world');
});
ava_1.default('throws on invalid `options.cookieJar.setCookie`', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        cookieJar: {
            // @ts-expect-error Error tests
            setCookie: 123
        }
    }), { message: 'Expected value which is `Function`, received value of type `number`.' });
});
ava_1.default('throws on invalid `options.cookieJar.getCookieString`', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        cookieJar: {
            setCookie: async () => { },
            // @ts-expect-error Error tests
            getCookieString: 123
        }
    }), { message: 'Expected value which is `Function`, received value of type `number`.' });
});
ava_1.default('cookies are cleared when redirecting to a different hostname (no cookieJar)', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.writeHead(302, {
            location: 'https://httpbin.org/anything'
        });
        response.end();
    });
    const { headers } = await got('', {
        headers: {
            cookie: 'foo=bar',
            'user-agent': 'custom'
        }
    }).json();
    t.is(headers.Cookie, undefined);
    t.is(headers['User-Agent'], 'custom');
});
