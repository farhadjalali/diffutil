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

	test('one root property change', () => {
		let _id = new ObjectId();
		let oldDoc = {_id, month: "may"};
		let newDoc = {_id, month: "april"};
		let expectedResult = [{query: {_id}, update: {$set: {month: "april"}}}];
		expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('two root property changes', () => {
		let _id = new ObjectId();
		let oldDoc = {_id, month: "may", day: 1};
		let newDoc = {_id, month: "april", day: 2};
		let expectedResult = [{query: {_id}, update: {$set: {month: "april", day: 2}}}];
		expect(main.diff(oldDoc, newDoc)).toEqual(expectedResult);
	});
});
