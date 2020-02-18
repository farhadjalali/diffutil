import _ = require("lodash");
import {Change, DiffKind, MongoPatchWithIdChange, ResultModel} from "./Types";

const idName = "_id";

function getChanges(oldDoc: any, newDoc: any, path: any, keyPrefix: string) {
	let changes: Change[] = [];

	let oldKeys = Object.keys(oldDoc);
	let newKeys = Object.keys(newDoc);
	let keys = _.union(oldKeys, newKeys);

	let compareBasedOnId = oldDoc[idName] && newDoc[idName];
	if (compareBasedOnId) {
		keys = keys.filter(key => key !== idName);
		if (!path) path = newDoc["_id"];
	}

	for (let key of keys) {
		let oldVal = oldDoc[key];
		let newVal = newDoc[key];

		let set = {};
		set[key] = newVal;
		let change = new Change();
		change.path = path;
		change.key = keyPrefix + key;

		if (oldVal == undefined) { // added property
			change.kind = DiffKind.added;
			change.newVal = newVal;

		} else if (newVal == undefined) { // deleted property
			change.kind = DiffKind.deleted;
			change.oldVal = oldVal;

		} else { // edited property
			change.kind = DiffKind.edited;
			change.newVal = newVal;
			change.oldVal = oldVal;

			if (_.isObject(newVal)) {
				if (_.isObject(oldVal)) {
					let innerChanges = getChanges(oldVal, newVal, path, change.key + ".");
					changes.push(...innerChanges);
					continue;
				} else {
					// nothing
				}
			} else {
				if (_.isObject(oldVal)) {

				} else {
					if (oldVal === newVal) // no change
						continue;
				}
			}
		}

		changes.push(change);
	}
	return changes;
}

export function diff(oldDoc: any, newDoc: any, model: ResultModel = ResultModel.MongoPatchWithId): any {
	if (!_.isObject(oldDoc) || !_.isObject(newDoc))
		return oldDoc === newDoc;

	let changes = getChanges(oldDoc, newDoc, null, "");

	switch (model) {
		case ResultModel.MongoPatchWithId:
			return mergeChangesOnMongoPatchWithId(changes);

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
		switch (change.kind) {
			case DiffKind.added:
			case DiffKind.edited:
				item.update.$set = item.update.$set || {};
				item.update.$set[change.key] = change.newVal;
				break;

			case DiffKind.deleted:
				item.update.$unset = item.update.$unset || {};
				item.update.$unset[change.key] = "";
				break;
		}
	}
	return result;
}
