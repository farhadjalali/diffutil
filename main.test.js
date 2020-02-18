"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main = require("./main");
const mongodb_1 = require("mongodb");
describe('simple objects', () => {
    test('diff none object', () => {
        expect(main.diff(1, 1)).toBeTruthy();
    });
    test('diff null object', () => {
        expect(main.diff(null, {})).toBeFalsy();
    });
    test('root: no change', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, month: "may" };
        let newDoc = { _id, month: "may" };
        let expectedResult = [];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('root: one change', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, month: "may" };
        let newDoc = { _id, month: "april" };
        let expectedResult = [{ query: { _id }, update: { $set: { month: "april" } } }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('root: text to object', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, title: "Roze" };
        let newDoc = { _id, title: { "en": "Roze" } };
        let expectedResult = [{ query: { _id }, update: { $set: { title: { "en": "Roze" } } } }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('root: object to text', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, title: { "en": "Roze" } };
        let newDoc = { _id, title: "Roze" };
        let expectedResult = [{ query: { _id }, update: { $set: { title: "Roze" } } }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('root: two changes', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, month: "may", day: 1 };
        let newDoc = { _id, month: "april", day: 2 };
        let expectedResult = [{ query: { _id }, update: { $set: { month: "april", day: 2 } } }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('root: one change and one delete', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, month: "may", day: 1 };
        let newDoc = { _id, month: "april" };
        let expectedResult = [{ query: { _id }, update: { $set: { month: "april" }, $unset: { day: "" } } }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('root: one change, one delete and one add', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, month: "may", day: 1 };
        let newDoc = { _id, month: "april", year: 2020 };
        let expectedResult = [{ query: { _id }, update: { $set: { year: 2020, month: "april" }, $unset: { day: "" } } }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('level2: one change', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, address: { no: 5, city: "London" } };
        let newDoc = { _id, address: { city: "Paris", no: 5 } };
        let expectedResult = [{ query: { _id }, update: { $set: { "address.city": "Paris" } } }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('level3: one change, one add, one remove', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, address: { city: "London", no: 5, location: { x: 50, y: 20 } } };
        let newDoc = { _id, address: { city: "Paris", location: { y: 22, z: 17 } } };
        let expectedResult = [{
                query: { _id },
                update: {
                    $set: { "address.city": "Paris", "address.location.y": 22, "address.location.z": 17 },
                    $unset: { "address.location.x": "", "address.no": "" }
                }
            }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
});
describe('array change', () => {
    test('level1 one change', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, addresses: [{ city: "London", no: 5 }] };
        let newDoc = { _id, addresses: [{ city: "Paris", no: 5 }] };
        let expectedResult = [{
                query: { _id },
                update: {
                    $set: { "addresses.0.city": "Paris" }
                }
            }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('level1 one change, one item add', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, addresses: [{ city: "London", no: 5 }] };
        let newDoc = { _id, addresses: [{ city: "Paris", no: 5 }, { city: "Istanbul", no: 8 }] };
        let expectedResult = [{
                query: { _id },
                update: {
                    $set: { "addresses.0.city": "Paris", "addresses.1": { city: "Istanbul", no: 8 } }
                }
            }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('level1 one change, one item delete', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, addresses: [{ city: "London", no: 5 }, { city: "Istanbul", no: 8 }] };
        let newDoc = { _id, addresses: [{ city: "Paris", no: 5 }] };
        let expectedResult = [{
                query: { _id },
                update: {
                    $set: { "addresses.0.city": "Paris" }, $unset: { "addresses.1": "" }
                }
            }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('level2 one change, one item add', () => {
        let _id = new mongodb_1.ObjectId();
        let oldDoc = { _id, addresses: [{ city: "London", streets: [{ name: "x-10" }] }] };
        let newDoc = { _id, addresses: [{ city: "London", streets: [{ name: "y-20" }, { name: "z-30" }] }] };
        let expectedResult = [{
                query: { _id },
                update: {
                    $set: { "addresses.0.streets.0.name": "y-20", "addresses.0.streets.1": { name: "z-30" } }
                }
            }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
});
describe('array change with _id', () => {
    test('one change', () => {
        let _id = new mongodb_1.ObjectId();
        let innerId = new mongodb_1.ObjectId();
        let oldDoc = { _id, addresses: [{ _id: innerId, city: "London", no: 5 }] };
        let newDoc = { _id, addresses: [{ _id: innerId, city: "London", no: 6 }] };
        let expectedResult = [{
                query: { _id },
                update: {
                    $set: { "addresses.$[item1].no": 6 }
                },
                options: {
                    arrayFilters: [{ "item1._id": innerId }]
                }
            }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
    test('one item add', () => {
        let _id = new mongodb_1.ObjectId();
        let innerId = new mongodb_1.ObjectId();
        let oldDoc = { _id };
        let newDoc = { _id, addresses: [{ _id: innerId, city: "London" }] };
        let expectedResult = [{
                query: { _id },
                update: {
                    $set: { "addresses.$[item1]": { _id: innerId, city: "London" } },
                },
                options: {
                    arrayFilters: [{ "item1._id": innerId }]
                }
            }];
        expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
    });
});
//# sourceMappingURL=main.test.js.map