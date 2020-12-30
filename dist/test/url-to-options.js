"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require("url");
const url_1 = require("url");
const ava_1 = require("ava");
const url_to_options_1 = require("../source/core/utils/url-to-options");
ava_1.default('converts node legacy URL to options', t => {
    const exampleUrl = 'https://user:password@github.com:443/say?hello=world#bang';
    const parsedUrl = url.parse(exampleUrl);
    const options = url_to_options_1.default(parsedUrl);
    const expected = {
        hash: '#bang',
        host: 'github.com:443',
        hostname: 'github.com',
        href: exampleUrl,
        path: '/say?hello=world',
        pathname: '/say',
        port: 443,
        protocol: 'https:',
        search: '?hello=world'
    };
    t.deepEqual(options, expected);
});
ava_1.default('converts URL to options', t => {
    const exampleUrl = 'https://user:password@github.com:443/say?hello=world#bang';
    const parsedUrl = new url_1.URL(exampleUrl);
    const options = url_to_options_1.default(parsedUrl);
    const expected = {
        auth: 'user:password',
        hash: '#bang',
        host: 'github.com',
        hostname: 'github.com',
        href: 'https://user:password@github.com/say?hello=world#bang',
        path: '/say?hello=world',
        pathname: '/say',
        protocol: 'https:',
        search: '?hello=world'
    };
    t.deepEqual(options, expected);
});
ava_1.default('converts IPv6 URL to options', t => {
    const IPv6URL = 'https://[2001:cdba::3257:9652]:443/';
    const parsedUrl = new url_1.URL(IPv6URL);
    const options = url_to_options_1.default(parsedUrl);
    const expected = {
        hash: '',
        host: '[2001:cdba::3257:9652]',
        hostname: '2001:cdba::3257:9652',
        href: 'https://[2001:cdba::3257:9652]/',
        path: '/',
        pathname: '/',
        protocol: 'https:',
        search: ''
    };
    t.deepEqual(options, expected);
});
ava_1.default('only adds port to options for URLs with ports', t => {
    const noPortURL = 'https://github.com/';
    const parsedUrl = new url_1.URL(noPortURL);
    const options = url_to_options_1.default(parsedUrl);
    const expected = {
        hash: '',
        host: 'github.com',
        hostname: 'github.com',
        href: 'https://github.com/',
        path: '/',
        pathname: '/',
        protocol: 'https:',
        search: ''
    };
    t.deepEqual(options, expected);
    t.false(Reflect.has(options, 'port'));
});
ava_1.default('does not concat null search to path', t => {
    const exampleUrl = 'https://github.com/';
    const parsedUrl = url.parse(exampleUrl);
    t.is(parsedUrl.search, null);
    const options = url_to_options_1.default(parsedUrl);
    const expected = {
        hash: null,
        host: 'github.com',
        hostname: 'github.com',
        href: 'https://github.com/',
        path: '/',
        pathname: '/',
        protocol: 'https:',
        search: null
    };
    t.deepEqual(options, expected);
});
ava_1.default('does not add null port to options', t => {
    const exampleUrl = 'https://github.com/';
    const parsedUrl = url.parse(exampleUrl);
    t.is(parsedUrl.port, null);
    const options = url_to_options_1.default(parsedUrl);
    const expected = {
        hash: null,
        host: 'github.com',
        hostname: 'github.com',
        href: 'https://github.com/',
        path: '/',
        pathname: '/',
        protocol: 'https:',
        search: null
    };
    t.deepEqual(options, expected);
});
ava_1.default('does not throw if there is no hostname', t => {
    t.notThrows(() => url_to_options_1.default({}));
});
ava_1.default('null password', t => {
    const options = url_to_options_1.default({
        username: 'foo',
        password: null
    });
    t.is(options.auth, 'foo:');
});
ava_1.default('null username', t => {
    const options = url_to_options_1.default({
        username: null,
        password: 'bar'
    });
    t.is(options.auth, ':bar');
});
