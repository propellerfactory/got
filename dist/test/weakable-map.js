"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const weakable_map_1 = require("../source/core/utils/weakable-map");
ava_1.default('works as expected', t => {
    const weakable = new weakable_map_1.default();
    weakable.set('hello', 'world');
    t.true(weakable.has('hello'));
    t.false(weakable.has('foobar'));
    t.is(weakable.get('hello'), 'world');
    t.is(weakable.get('foobar'), undefined);
    const object = {};
    const anotherObject = {};
    weakable.set(object, 'world');
    t.true(weakable.has(object));
    t.false(weakable.has(anotherObject));
    t.is(weakable.get(object), 'world');
    t.is(weakable.get(anotherObject), undefined);
});
