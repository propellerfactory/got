"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const zlib = require("zlib");
const ava_1 = require("ava");
const getStream = require("get-stream");
const with_server_1 = require("./helpers/with-server");
const source_1 = require("../source");
const testContent = 'Compressible response content.\n';
const testContentUncompressed = 'Uncompressed response content.\n';
let gzipData;
ava_1.default.before('setup', async () => {
    gzipData = await util_1.promisify(zlib.gzip)(testContent);
});
ava_1.default('decompress content', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Content-Encoding', 'gzip');
        response.end(gzipData);
    });
    t.is((await got('')).body, testContent);
});
ava_1.default('decompress content on error', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Content-Encoding', 'gzip');
        response.status(404);
        response.end(gzipData);
    });
    const error = await t.throwsAsync(got(''));
    t.is(error.response.body, testContent);
});
ava_1.default('decompress content - stream', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Content-Encoding', 'gzip');
        response.end(gzipData);
    });
    t.is((await getStream(got.stream(''))), testContent);
});
ava_1.default('handles gzip error', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Content-Encoding', 'gzip');
        response.end('Not gzipped content');
    });
    await t.throwsAsync(got(''), {
        name: 'ReadError',
        message: 'incorrect header check'
    });
});
ava_1.default('no unhandled `Premature close` error', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Content-Encoding', 'gzip');
        response.write('Not gzipped content');
    });
    await t.throwsAsync(got(''), {
        name: 'ReadError',
        message: 'incorrect header check'
    });
});
ava_1.default('handles gzip error - stream', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Content-Encoding', 'gzip');
        response.end('Not gzipped content');
    });
    await t.throwsAsync(getStream(got.stream('')), {
        name: 'ReadError',
        message: 'incorrect header check'
    });
});
ava_1.default('decompress option opts out of decompressing', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Content-Encoding', 'gzip');
        response.end(gzipData);
    });
    const { body } = await got({ decompress: false, responseType: 'buffer' });
    t.is(Buffer.compare(body, gzipData), 0);
});
ava_1.default('decompress option doesn\'t alter encoding of uncompressed responses', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end(testContentUncompressed);
    });
    const { body } = await got({ decompress: false });
    t.is(body, testContentUncompressed);
});
ava_1.default('preserves `headers` property', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Content-Encoding', 'gzip');
        response.end(gzipData);
    });
    t.truthy((await got('')).headers);
});
ava_1.default('does not break HEAD responses', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end();
    });
    t.is((await got.head('')).body, '');
});
ava_1.default('does not ignore missing data', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Content-Encoding', 'gzip');
        response.end(gzipData.slice(0, -1));
    });
    await t.throwsAsync(got(''), {
        instanceOf: source_1.ReadError,
        message: 'unexpected end of file'
    });
});
ava_1.default('response has `url` and `requestUrl` properties', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Content-Encoding', 'gzip');
        response.end(gzipData);
    });
    const response = await got('');
    t.truthy(response.url);
    t.truthy(response.requestUrl);
});
