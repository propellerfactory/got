"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util_1 = require("util");
const path = require("path");
const ava_1 = require("ava");
const FormData = require("form-data");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const supportsBrotli = typeof process.versions.brotli === 'string';
const echoHeaders = (request, response) => {
    request.resume();
    response.end(JSON.stringify(request.headers));
};
ava_1.default('`user-agent`', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const headers = await got('').json();
    t.is(headers['user-agent'], 'got (https://github.com/sindresorhus/got)');
});
ava_1.default('`accept-encoding`', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const headers = await got('').json();
    t.is(headers['accept-encoding'], supportsBrotli ? 'gzip, deflate, br' : 'gzip, deflate');
});
ava_1.default('does not override provided `accept-encoding`', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const headers = await got({
        headers: {
            'accept-encoding': 'gzip'
        }
    }).json();
    t.is(headers['accept-encoding'], 'gzip');
});
ava_1.default('does not remove user headers from `url` object argument', with_server_1.default, async (t, server) => {
    server.get('/', echoHeaders);
    const headers = (await source_1.default({
        url: `http://${server.hostname}:${server.port}`,
        responseType: 'json',
        headers: {
            'X-Request-Id': 'value'
        }
    })).body;
    t.is(headers.accept, 'application/json');
    t.is(headers['user-agent'], 'got (https://github.com/sindresorhus/got)');
    t.is(headers['accept-encoding'], supportsBrotli ? 'gzip, deflate, br' : 'gzip, deflate');
    t.is(headers['x-request-id'], 'value');
});
ava_1.default('does not set `accept-encoding` header when `options.decompress` is false', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const headers = await got({
        decompress: false
    }).json();
    // @ts-expect-error Error tests
    t.false(Reflect.has(headers, 'accept-encoding'));
});
ava_1.default('`accept` header with `json` option', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    let headers = await got('').json();
    t.is(headers.accept, 'application/json');
    headers = await got({
        headers: {
            accept: ''
        }
    }).json();
    t.is(headers.accept, '');
});
ava_1.default('`host` header', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const headers = await got('').json();
    t.is(headers.host, `localhost:${server.port}`);
});
ava_1.default('transforms names to lowercase', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const headers = (await got({
        headers: {
            'ACCEPT-ENCODING': 'identity'
        },
        responseType: 'json'
    })).body;
    t.is(headers['accept-encoding'], 'identity');
});
ava_1.default('setting `content-length` to 0', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const { body } = await got.post({
        headers: {
            'content-length': '0'
        },
        body: 'sup'
    });
    const headers = JSON.parse(body);
    t.is(headers['content-length'], '0');
});
ava_1.default('sets `content-length` to `0` when requesting PUT with empty body', with_server_1.default, async (t, server, got) => {
    server.put('/', echoHeaders);
    const { body } = await got({
        method: 'PUT'
    });
    const headers = JSON.parse(body);
    t.is(headers['content-length'], '0');
});
ava_1.default('form manual `content-type` header', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const { body } = await got.post({
        headers: {
            'content-type': 'custom'
        },
        form: {
            a: 1
        }
    });
    const headers = JSON.parse(body);
    t.is(headers['content-type'], 'custom');
});
ava_1.default('form-data manual `content-type` header', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const form = new FormData();
    form.append('a', 'b');
    const { body } = await got.post({
        headers: {
            'content-type': 'custom'
        },
        body: form
    });
    const headers = JSON.parse(body);
    t.is(headers['content-type'], 'custom');
});
ava_1.default('form-data automatic `content-type` header', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const form = new FormData();
    form.append('a', 'b');
    const { body } = await got.post({
        body: form
    });
    const headers = JSON.parse(body);
    t.is(headers['content-type'], `multipart/form-data; boundary=${form.getBoundary()}`);
});
ava_1.default('form-data sets `content-length` header', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const form = new FormData();
    form.append('a', 'b');
    const { body } = await got.post({ body: form });
    const headers = JSON.parse(body);
    t.is(headers['content-length'], '157');
});
ava_1.default('stream as `options.body` sets `content-length` header', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const fixture = path.resolve('test/fixtures/stream-content-length');
    const { size } = await util_1.promisify(fs.stat)(fixture);
    const { body } = await got.post({
        body: fs.createReadStream(fixture)
    });
    const headers = JSON.parse(body);
    t.is(Number(headers['content-length']), size);
});
ava_1.default('buffer as `options.body` sets `content-length` header', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const buffer = Buffer.from('unicorn');
    const { body } = await got.post({
        body: buffer
    });
    const headers = JSON.parse(body);
    t.is(Number(headers['content-length']), buffer.length);
});
ava_1.default('throws on null value headers', async (t) => {
    await t.throwsAsync(source_1.default({
        url: 'https://example.com',
        headers: {
            // @ts-expect-error Testing purposes
            'user-agent': null
        }
    }), {
        message: 'Use `undefined` instead of `null` to delete the `user-agent` header'
    });
});
ava_1.default('removes undefined value headers', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const { body } = await got({
        headers: {
            'user-agent': undefined
        }
    });
    const headers = JSON.parse(body);
    t.is(headers['user-agent'], undefined);
});
ava_1.default('non-existent headers set to undefined are omitted', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const { body } = await got({
        headers: {
            blah: undefined
        }
    });
    const headers = JSON.parse(body);
    t.false(Reflect.has(headers, 'blah'));
});
ava_1.default('preserve port in host header if non-standard port', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const body = await got('').json();
    t.is(body.host, `localhost:${server.port}`);
});
ava_1.default('strip port in host header if explicit standard port (:80) & protocol (HTTP)', async (t) => {
    const body = await source_1.default('http://httpbin.org:80/headers').json();
    t.is(body.headers.Host, 'httpbin.org');
});
ava_1.default('strip port in host header if explicit standard port (:443) & protocol (HTTPS)', async (t) => {
    const body = await source_1.default('https://httpbin.org:443/headers').json();
    t.is(body.headers.Host, 'httpbin.org');
});
ava_1.default('strip port in host header if implicit standard port & protocol (HTTP)', async (t) => {
    const body = await source_1.default('http://httpbin.org/headers').json();
    t.is(body.headers.Host, 'httpbin.org');
});
ava_1.default('strip port in host header if implicit standard port & protocol (HTTPS)', async (t) => {
    const body = await source_1.default('https://httpbin.org/headers').json();
    t.is(body.headers.Host, 'httpbin.org');
});
