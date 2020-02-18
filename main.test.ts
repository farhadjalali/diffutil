import main = require("./main");
import {ObjectId} from 'mongodb';
import {ResultModel} from "./Types";

describe('mongo patch with _id', () => {
	test('diff none object', () => {
		expect(main.diff(1, 1)).toBeTruthy();
	});

	test('diff null object', () => {
		expect(main.diff(null, {})).toBeFalsy();
	});

	test('root: no change', () => {
		let _id = new ObjectId();
		let oldDoc = {_id, month: "may"};
		let newDoc = {_id, month: "may"};
		let expectedResult = [];
		expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('root: one change', () => {
		let _id = new ObjectId();
		let oldDoc = {_id, month: "may"};
		let newDoc = {_id, month: "april"};
		let expectedResult = [{query: {_id}, update: {$set: {month: "april"}}}];
		expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('root: two changes', () => {
		let _id = new ObjectId();
		let oldDoc = {_id, month: "may", day: 1};
		let newDoc = {_id, month: "april", day: 2};
		let expectedResult = [{query: {_id}, update: {$set: {month: "april", day: 2}}}];
		expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('root: one change and one delete', () => {
		let _id = new ObjectId();
		let oldDoc = {_id, month: "may", day: 1};
		let newDoc = {_id, month: "april"};
		let expectedResult = [{query: {_id}, update: {$set: {month: "april"}, $unset: {day: ""}}}];

		expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('root: one change, one delete and one add', () => {
		let _id = new ObjectId();
		let oldDoc = {_id, month: "may", day: 1};
		let newDoc = {_id, month: "april", year: 2020};
		let expectedResult = [{query: {_id}, update: {$set: {month: "april", year: 2020}, $unset: {day: ""}}}];

		expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('level2: one change', () => {
		let _id = new ObjectId();
		let oldDoc = {_id, address: {city: "London", no: 5}};
		let newDoc = {_id, address: {city: "Paris", no: 5}};
		let expectedResult = [{query: {_id}, update: {$set: {"address.city": "Paris"}}}];

		expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
	});
});
