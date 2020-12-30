"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const ava_1 = require("ava");
const delay = require("delay");
const getStream = require("get-stream");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const thrower = () => {
    throw new Error('This should not be called');
};
const resetPagination = {
    paginate: undefined,
    transform: undefined,
    filter: undefined,
    shouldContinue: undefined
};
const attachHandler = (server, count) => {
    server.get('/', (request, response) => {
        const searchParameters = new URLSearchParams(request.url.split('?')[1]);
        const page = Number(searchParameters.get('page')) || 1;
        if (page < count) {
            response.setHeader('link', `<${server.url}/?page=${page + 1}>; rel="next"`);
        }
        response.end(`[${page <= count ? page : ''}]`);
    });
};
ava_1.default('the link header has no next value', with_server_1.default, async (t, server, got) => {
    const items = [1];
    server.get('/', (_request, response) => {
        response.setHeader('link', '<https://example.com>; rel="prev"');
        response.end(JSON.stringify(items));
    });
    const received = await got.paginate.all('');
    t.deepEqual(received, items);
});
ava_1.default('retrieves all elements', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 2);
    const result = await got.paginate.all('');
    t.deepEqual(result, [1, 2]);
});
ava_1.default('retrieves all elements with JSON responseType', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 2);
    const result = await got.extend({
        responseType: 'json'
    }).paginate.all('');
    t.deepEqual(result, [1, 2]);
});
ava_1.default('points to defaults when extending Got without custom `pagination`', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 2);
    const result = await got.extend().paginate.all('');
    t.deepEqual(result, [1, 2]);
});
ava_1.default('pagination options can be extended', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 2);
    const result = await got.extend({
        pagination: {
            shouldContinue: () => false
        }
    }).paginate.all('');
    t.deepEqual(result, []);
});
ava_1.default('filters elements', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 3);
    const result = await got.paginate.all({
        pagination: {
            filter: (element, allItems, currentItems) => {
                t.true(Array.isArray(allItems));
                t.true(Array.isArray(currentItems));
                return element !== 2;
            }
        }
    });
    t.deepEqual(result, [1, 3]);
});
ava_1.default('parses elements', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 100);
    const result = await got.paginate.all('?page=100', {
        pagination: {
            transform: response => [response.body.length]
        }
    });
    t.deepEqual(result, [5]);
});
ava_1.default('parses elements - async function', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 100);
    const result = await got.paginate.all('?page=100', {
        pagination: {
            transform: async (response) => [response.body.length]
        }
    });
    t.deepEqual(result, [5]);
});
ava_1.default('custom paginate function', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 3);
    const result = await got.paginate.all({
        pagination: {
            paginate: response => {
                const url = new url_1.URL(response.url);
                if (url.search === '?page=3') {
                    return false;
                }
                url.search = '?page=3';
                return { url };
            }
        }
    });
    t.deepEqual(result, [1, 3]);
});
ava_1.default('custom paginate function using allItems', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 3);
    const result = await got.paginate.all({
        pagination: {
            paginate: (_response, allItems) => {
                if (allItems.length === 2) {
                    return false;
                }
                return { path: '/?page=3' };
            }
        }
    });
    t.deepEqual(result, [1, 3]);
});
ava_1.default('custom paginate function using currentItems', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 3);
    const result = await got.paginate.all({
        pagination: {
            paginate: (_response, _allItems, currentItems) => {
                if (currentItems[0] === 3) {
                    return false;
                }
                return { path: '/?page=3' };
            }
        }
    });
    t.deepEqual(result, [1, 3]);
});
ava_1.default('iterator works', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 5);
    const results = [];
    for await (const item of got.paginate('')) {
        results.push(item);
    }
    t.deepEqual(results, [1, 2, 3, 4, 5]);
});
ava_1.default('iterator works #2', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 5);
    const results = [];
    for await (const item of got.paginate.each('')) {
        results.push(item);
    }
    t.deepEqual(results, [1, 2, 3, 4, 5]);
});
ava_1.default('`shouldContinue` works', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 2);
    const options = {
        pagination: {
            shouldContinue: (_item, allItems, currentItems) => {
                t.true(Array.isArray(allItems));
                t.true(Array.isArray(currentItems));
                return false;
            }
        }
    };
    const results = [];
    for await (const item of got.paginate(options)) {
        results.push(item);
    }
    t.deepEqual(results, []);
});
ava_1.default('`countLimit` works', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 2);
    const options = {
        pagination: {
            countLimit: 1
        }
    };
    const results = [];
    for await (const item of got.paginate(options)) {
        results.push(item);
    }
    t.deepEqual(results, [1]);
});
ava_1.default('throws if no `pagination` option', async (t) => {
    const iterator = source_1.default.extend({
        pagination: false
    }).paginate('', {
        prefixUrl: 'https://example.com'
    });
    await t.throwsAsync(iterator.next(), {
        message: '`options.pagination` must be implemented'
    });
});
ava_1.default('throws if the `pagination` option does not have `transform` property', async (t) => {
    const iterator = source_1.default.paginate('', {
        pagination: { ...resetPagination },
        prefixUrl: 'https://example.com'
    });
    await t.throwsAsync(iterator.next(), {
        message: '`options.pagination.transform` must be implemented'
    });
});
ava_1.default('throws if the `pagination` option does not have `shouldContinue` property', async (t) => {
    const iterator = source_1.default.paginate('', {
        pagination: {
            ...resetPagination,
            transform: thrower
        },
        prefixUrl: 'https://example.com'
    });
    await t.throwsAsync(iterator.next(), {
        message: '`options.pagination.shouldContinue` must be implemented'
    });
});
ava_1.default('throws if the `pagination` option does not have `filter` property', async (t) => {
    const iterator = source_1.default.paginate('', {
        pagination: {
            ...resetPagination,
            transform: thrower,
            shouldContinue: thrower,
            paginate: thrower
        },
        prefixUrl: 'https://example.com'
    });
    await t.throwsAsync(iterator.next(), {
        message: '`options.pagination.filter` must be implemented'
    });
});
ava_1.default('throws if the `pagination` option does not have `paginate` property', async (t) => {
    const iterator = source_1.default.paginate('', {
        pagination: {
            ...resetPagination,
            transform: thrower,
            shouldContinue: thrower,
            filter: thrower
        },
        prefixUrl: 'https://example.com'
    });
    await t.throwsAsync(iterator.next(), {
        message: '`options.pagination.paginate` must be implemented'
    });
});
ava_1.default('ignores the `resolveBodyOnly` option', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 2);
    const items = await got.paginate.all('', {
        resolveBodyOnly: true
    });
    t.deepEqual(items, [1, 2]);
});
ava_1.default('allowGetBody sends json payload with .paginate()', with_server_1.withBodyParsingServer, async (t, server, got) => {
    server.get('/', (request, response) => {
        if (request.body.hello !== 'world') {
            response.statusCode = 400;
        }
        response.end(JSON.stringify([1, 2, 3]));
    });
    const iterator = got.paginate({
        allowGetBody: true,
        json: { hello: 'world' },
        retry: 0
    });
    const results = [];
    for await (const item of iterator) {
        results.push(item);
    }
    t.deepEqual(results, [1, 2, 3]);
});
ava_1.default('`hooks` are not duplicated', with_server_1.default, async (t, server, got) => {
    let page = 1;
    server.get('/', (_request, response) => {
        response.end(JSON.stringify([page++]));
    });
    const nopHook = () => { };
    const result = await got.paginate.all({
        pagination: {
            paginate: response => {
                if (response.body === '[3]') {
                    return false; // Stop after page 3
                }
                const { options } = response.request;
                const { init, beforeRequest, beforeRedirect, beforeRetry, afterResponse, beforeError } = options.hooks;
                const hooksCount = [init, beforeRequest, beforeRedirect, beforeRetry, afterResponse, beforeError].map(a => a.length);
                t.deepEqual(hooksCount, [1, 1, 1, 1, 1, 1]);
                return options;
            }
        },
        hooks: {
            init: [nopHook],
            beforeRequest: [nopHook],
            beforeRedirect: [nopHook],
            beforeRetry: [nopHook],
            afterResponse: [response => response],
            beforeError: [error => error]
        }
    });
    t.deepEqual(result, [1, 2, 3]);
});
ava_1.default('allowGetBody sends correct json payload with .paginate()', with_server_1.default, async (t, server, got) => {
    let page = 1;
    server.get('/', async (request, response) => {
        const payload = await getStream(request);
        try {
            JSON.parse(payload);
        }
        catch (_a) {
            response.statusCode = 422;
        }
        if (request.headers['content-length']) {
            t.is(Number(request.headers['content-length'] || 0), Buffer.byteLength(payload));
        }
        response.end(JSON.stringify([page++]));
    });
    let body = '';
    const iterator = got.paginate({
        allowGetBody: true,
        retry: 0,
        json: { body },
        pagination: {
            paginate: () => {
                if (body.length === 2) {
                    return false;
                }
                body += 'a';
                return {
                    json: { body }
                };
            }
        }
    });
    const results = [];
    for await (const item of iterator) {
        results.push(item);
    }
    t.deepEqual(results, [1, 2, 3]);
});
ava_1.default('`requestLimit` works', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 2);
    const options = {
        pagination: {
            requestLimit: 1
        }
    };
    const results = [];
    for await (const item of got.paginate(options)) {
        results.push(item);
    }
    t.deepEqual(results, [1]);
});
ava_1.default('`backoff` works', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 2);
    const backoff = 200;
    const asyncIterator = got.paginate('', {
        pagination: {
            backoff
        }
    });
    t.is((await asyncIterator.next()).value, 1);
    let receivedLastOne = false;
    const start = Date.now();
    const promise = asyncIterator.next();
    (async () => {
        await promise;
        receivedLastOne = true;
    })();
    await delay(backoff / 2);
    t.false(receivedLastOne);
    await promise;
    t.true(Date.now() - start >= backoff);
});
ava_1.default('`stackAllItems` set to true', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 3);
    let itemCount = 0;
    const result = await got.paginate.all({
        pagination: {
            stackAllItems: true,
            filter: (_item, allItems, _currentItems) => {
                t.is(allItems.length, itemCount);
                return true;
            },
            shouldContinue: (_item, allItems, _currentItems) => {
                t.is(allItems.length, itemCount);
                return true;
            },
            paginate: (response, allItems, currentItems) => {
                itemCount += 1;
                t.is(allItems.length, itemCount);
                return got.defaults.options.pagination.paginate(response, allItems, currentItems);
            }
        }
    });
    t.deepEqual(result, [1, 2, 3]);
});
ava_1.default('`stackAllItems` set to false', with_server_1.default, async (t, server, got) => {
    attachHandler(server, 3);
    const result = await got.paginate.all({
        pagination: {
            stackAllItems: false,
            filter: (_item, allItems, _currentItems) => {
                t.is(allItems.length, 0);
                return true;
            },
            shouldContinue: (_item, allItems, _currentItems) => {
                t.is(allItems.length, 0);
                return true;
            },
            paginate: (response, allItems, currentItems) => {
                t.is(allItems.length, 0);
                return got.defaults.options.pagination.paginate(response, allItems, currentItems);
            }
        }
    });
    t.deepEqual(result, [1, 2, 3]);
});
ava_1.default('next url in json response', with_server_1.default, async (t, server, got) => {
    server.get('/', (request, response) => {
        var _a;
        const parameters = new URLSearchParams(request.url.slice(2));
        const page = Number((_a = parameters.get('page')) !== null && _a !== void 0 ? _a : 0);
        response.end(JSON.stringify({
            currentUrl: request.url,
            next: page < 3 ? `${server.url}/?page=${page + 1}` : undefined
        }));
    });
    const all = await got.paginate.all('', {
        searchParams: {
            page: 0
        },
        responseType: 'json',
        pagination: {
            transform: (response) => {
                return [response.body.currentUrl];
            },
            paginate: (response) => {
                const { next } = response.body;
                if (!next) {
                    return false;
                }
                return {
                    url: next,
                    prefixUrl: '',
                    searchParams: undefined
                };
            }
        }
    });
    t.deepEqual(all, [
        '/?page=0',
        '/?page=1',
        '/?page=2',
        '/?page=3'
    ]);
});
ava_1.default('pagination using searchParams', with_server_1.default, async (t, server, got) => {
    server.get('/', (request, response) => {
        var _a;
        const parameters = new URLSearchParams(request.url.slice(2));
        const page = Number((_a = parameters.get('page')) !== null && _a !== void 0 ? _a : 0);
        response.end(JSON.stringify({
            currentUrl: request.url,
            next: page < 3
        }));
    });
    const all = await got.paginate.all('', {
        searchParams: {
            page: 0
        },
        responseType: 'json',
        pagination: {
            transform: (response) => {
                return [response.body.currentUrl];
            },
            paginate: (response) => {
                const { next } = response.body;
                const previousPage = Number(response.request.options.searchParams.get('page'));
                if (!next) {
                    return false;
                }
                return {
                    searchParams: {
                        page: previousPage + 1
                    }
                };
            }
        }
    });
    t.deepEqual(all, [
        '/?page=0',
        '/?page=1',
        '/?page=2',
        '/?page=3'
    ]);
});
ava_1.default('pagination using extended searchParams', with_server_1.default, async (t, server, got) => {
    server.get('/', (request, response) => {
        var _a;
        const parameters = new URLSearchParams(request.url.slice(2));
        const page = Number((_a = parameters.get('page')) !== null && _a !== void 0 ? _a : 0);
        response.end(JSON.stringify({
            currentUrl: request.url,
            next: page < 3
        }));
    });
    const client = got.extend({
        searchParams: {
            limit: 10
        }
    });
    const all = await client.paginate.all('', {
        searchParams: {
            page: 0
        },
        responseType: 'json',
        pagination: {
            transform: (response) => {
                return [response.body.currentUrl];
            },
            paginate: (response) => {
                const { next } = response.body;
                const previousPage = Number(response.request.options.searchParams.get('page'));
                if (!next) {
                    return false;
                }
                return {
                    searchParams: {
                        page: previousPage + 1
                    }
                };
            }
        }
    });
    t.deepEqual(all, [
        '/?page=0&limit=10',
        '/?page=1&limit=10',
        '/?page=2&limit=10',
        '/?page=3&limit=10'
    ]);
});
