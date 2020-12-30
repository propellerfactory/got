"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const ava_1 = require("ava");
const source_1 = require("../source");
ava_1.default('should merge options replacing responseType', t => {
    const responseType = 'json';
    const options = source_1.default.mergeOptions(source_1.default.defaults.options, {
        responseType
    });
    t.is(options.responseType, responseType);
});
ava_1.default('no duplicated searchParams values', t => {
    var _a, _b, _c;
    const options = source_1.default.mergeOptions(source_1.default.defaults.options, {
        searchParams: 'string=true&noDuplication=true'
    }, {
        searchParams: new url_1.URLSearchParams({
            instance: 'true',
            noDuplication: 'true'
        })
    });
    t.is((_a = options.searchParams) === null || _a === void 0 ? void 0 : _a.get('string'), 'true');
    t.is((_b = options.searchParams) === null || _b === void 0 ? void 0 : _b.get('instance'), 'true');
    t.is((_c = options.searchParams) === null || _c === void 0 ? void 0 : _c.getAll('noDuplication').length, 1);
});
ava_1.default('should copy non-numerable properties', t => {
    const options = {
        json: { hello: '123' }
    };
    const merged = source_1.default.mergeOptions(source_1.default.defaults.options, options);
    const mergedTwice = source_1.default.mergeOptions(source_1.default.defaults.options, merged);
    t.is(mergedTwice.json, options.json);
});
ava_1.default('should replace URLs', t => {
    const options = source_1.default.mergeOptions({
        url: new url_1.URL('http://localhost:41285'),
        searchParams: new url_1.URLSearchParams('page=0')
    }, {
        url: 'http://localhost:41285/?page=1',
        searchParams: undefined
    });
    const otherOptions = source_1.default.mergeOptions({
        url: new url_1.URL('http://localhost:41285'),
        searchParams: {
            page: 0
        }
    }, {
        url: 'http://localhost:41285/?page=1',
        searchParams: undefined
    });
    t.is(options.url.href, 'http://localhost:41285/?page=1');
    t.is(otherOptions.url.href, 'http://localhost:41285/?page=1');
});
ava_1.default('should get username and password from the URL', t => {
    const options = source_1.default.mergeOptions({
        url: 'http://user:pass@localhost:41285'
    });
    t.is(options.username, 'user');
    t.is(options.password, 'pass');
});
ava_1.default('should get username and password from the options', t => {
    const options = source_1.default.mergeOptions({
        url: 'http://user:pass@localhost:41285',
        username: 'user_OPT',
        password: 'pass_OPT'
    });
    t.is(options.username, 'user_OPT');
    t.is(options.password, 'pass_OPT');
});
ava_1.default('should get username and password from the merged options', t => {
    const options = source_1.default.mergeOptions({
        url: 'http://user:pass@localhost:41285'
    }, {
        username: 'user_OPT_MERGE',
        password: 'pass_OPT_MERGE'
    });
    t.is(options.username, 'user_OPT_MERGE');
    t.is(options.password, 'pass_OPT_MERGE');
});
ava_1.default('null value in search params means empty', t => {
    const options = source_1.default.mergeOptions({
        url: new url_1.URL('http://localhost'),
        searchParams: {
            foo: null
        }
    });
    t.is(options.url.href, 'http://localhost/?foo=');
});
ava_1.default('undefined value in search params means it does not exist', t => {
    const options = source_1.default.mergeOptions({
        url: new url_1.URL('http://localhost'),
        searchParams: {
            foo: undefined
        }
    });
    t.is(options.url.href, 'http://localhost/');
});
