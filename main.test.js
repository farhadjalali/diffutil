"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main = require("./main");
const mongodb_1 = require("mongodb");
describe('mongo patch with _id', () => {
    test('diff none object', () => {
        expect(main.diff(1, 1)).toBeTruthy();
    });
    test('diff null object', () => {
        expect(main.diff(null, {})).toBeFalsy();
    });
    test('one root property change', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, month: "may" };
        let newDoc = { _id, month: "april" };
        let expectedResult = [{ query: { _id }, update: { $set: { month: "april" } } }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('two root property changes', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, month: "may", day: 1 };
        let newDoc = { _id, month: "april", day: 2 };
        let expectedResult = [{ query: { _id }, update: { $set: { month: "april", day: 2 } } }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
});
//# sourceMappingURL=main.test.js.map