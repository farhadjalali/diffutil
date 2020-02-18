import _ = require("lodash");
import {Change, DiffKind, MongoPatchWithIdChange, ResultModel} from "./Types";

export function diff(oldDoc: any, newDoc: any, model: ResultModel = ResultModel.MongoPatchWithId): any {
	if (!_.isObject(oldDoc) || !_.isObject(newDoc))
		return oldDoc === newDoc;

	switch (model) {
		case ResultModel.MongoPatchWithId:
			return diffMongoPatchWithId(oldDoc, newDoc);

		default:
			throw "Not implemented model!";
	}
}

function mergeChangesOnMongoPatchWithId(changes: Change[]): MongoPatchWithIdChange[] {
	let result: MongoPatchWithIdChange[] = [];
	for (let change of changes) {
		let item = _.find<MongoPatchWithIdChange>(result, ch => ch.query._id.equals(change.path));
		if (!item) {
			item = {query: {_id: change.path}, update: {}};
			result.push(item);
		}
		if (change.kind == DiffKind.edited) {
			if (change.newVal == undefined) {
				item.update.$unset = item.update.$unset || {};
				item.update.$unset[change.key] = "";
			} else {
				item.update.$set = item.update.$set || {};
				item.update.$set[change.key] = change.newVal;
			}
		}
	}
	return result;
}

export function diffMongoPatchWithId(oldDoc: any, newDoc: any): MongoPatchWithIdChange[] {
	let changes: Change[] = [];
	const idName = "_id";

	for (let key in oldDoc) {
		if (key === idName) continue;

		let oldVal = oldDoc[key];
		let newVal = newDoc[key];

		let set = {};
		set[key] = newVal;
		let change: Change = {path: oldDoc._id, key, newVal: newVal, oldVal: oldVal, kind: DiffKind.edited};
		changes.push(change);

		if (_.isObject(newVal)) {
			if (!_.isObject(oldVal)) {
				// nothing
			} else {
				// looop
			}
		} else {
			if (_.isObject(oldVal)) {

			} else {
				// nothing
			}
		}
	}

	return mergeChangesOnMongoPatchWithId(changes);
}
