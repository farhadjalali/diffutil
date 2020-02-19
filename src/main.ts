import _ = require("lodash");
import { ObjectId } from "bson";
import { Change, DiffKind, ResultModel, MongoUpdateParams } from "./types";

const idName = "_id";

function getArrayChanges(oldArray: any[], newArray: any[], path: any, keyPrefix: string) {
	let changes: Change[] = [];

	if (_.some(oldArray, item => !item[idName]) || _.some(newArray, item => !item[idName])) { // Item without _id found
		let minLength = Math.min(newArray.length, oldArray.length);
		for (let i = 0; i < minLength; i++) { // Change
			let innerChanges = getChanges(oldArray[i], newArray[i], path, keyPrefix + i + ".");
			changes.push(...innerChanges);
		}
		if (newArray.length > oldArray.length)
			for (let i = minLength; i < newArray.length; i++) { // added
				let change = new Change(path, keyPrefix + i);
				change.kind = DiffKind.arrayAdded;
				change.newVal = newArray[i];
				changes.push(change);
			}
		else
			for (let i = minLength; i < oldArray.length; i++) { // deleted
				let change = new Change(path, keyPrefix + i);
				change.kind = DiffKind.arrayDeleted;
				change.oldVal = oldArray[i];
				changes.push(change);
			}
	} else { // Item with _id
		let oldIDs = oldArray.map(item => item[idName]);
		let newIDs = newArray.map(item => item[idName]);
		let IDs = _.union(oldIDs, newIDs);
		for (let id of IDs) {
			let oldItem = _.find(oldArray, item => item._id.equals(id));
			let newItem = _.find(newArray, item => item._id.equals(id));

			let itemKeyPrefix = keyPrefix;
			if (isObjectId(id))
				itemKeyPrefix += "$[$oid:" + id + "]";
			else
				itemKeyPrefix += "$[" + id + "]";

			if (oldItem == undefined) { // added item
				let change = new Change(path, itemKeyPrefix);
				change.kind = DiffKind.arrayAdded;
				change.newVal = newItem;
				changes.push(change);
			} else if (newItem == undefined) { // deleted item
				let change = new Change(path, itemKeyPrefix);
				change.kind = DiffKind.arrayDeleted;
				change.oldVal = oldItem;
				changes.push(change);
			} else { // edited
				let innerChanges = getChanges(oldItem, newItem, path, itemKeyPrefix + ".");
				changes.push(...innerChanges);
			}
		}
	}

	return changes;
}

function isObjectId(value: any): boolean {
	return value._bsontype == "ObjectID";
}

function getChanges(oldDoc: any, newDoc: any, path: any, keyPrefix: string): Change[] {
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

		let change = new Change(path, keyPrefix + key);

		if (oldVal == undefined && Array.isArray(newVal))
			oldVal = [];

		if (oldVal == undefined) { // added property
			change.kind = DiffKind.added;
			change.newVal = newVal;
			changes.push(change);

		} else if (newVal == undefined) { // deleted property
			change.kind = DiffKind.deleted;
			change.oldVal = oldVal;
			changes.push(change);

		} else { // edited property
			change.kind = DiffKind.edited;
			change.newVal = newVal;
			change.oldVal = oldVal;

			if (Array.isArray(newVal) && Array.isArray(oldVal)) {
				let arrayChanges = getArrayChanges(oldVal, newVal, path, change.key + ".");
				changes.push(...arrayChanges);
			} else if (_.isObject(newVal)) {
				if (_.isObject(oldVal)) {
					let innerChanges = getChanges(oldVal, newVal, path, change.key + ".");
					changes.push(...innerChanges);
				} else {
					changes.push(change);
				}
			} else {
				if (_.isObject(oldVal)) {
					changes.push(change);
				} else {
					if (oldVal !== newVal) // no change
						changes.push(change);
				}
			}
		}
	}
	return changes;
}

export function diff(oldDoc: any, newDoc: any, model: ResultModel = ResultModel.MongoPatch): any {
	if (!_.isObject(oldDoc) || !_.isObject(newDoc))
		return oldDoc === newDoc;

	let changes = getChanges(oldDoc, newDoc, null, "");

	switch (model) {
		case ResultModel.MongoPatch:
			return mergeChangesOnMongoPatchWithId(changes);

		case ResultModel.Restful:
			throw "'Restful' is not implemented yet";

		case ResultModel.ChangeSet:
			return changes;
	}
}

function mergeChangesOnMongoPatchWithId(changes: Change[]): MongoUpdateParams[] {
	let result: MongoUpdateParams[] = [];
	let filterItemIndex = 0;
	for (let change of changes) {
		let resultItem = _.find<MongoUpdateParams>(result, ch => ch.query._id.equals(change.path));
		if (!resultItem) {
			resultItem = {query: {_id: change.path}, update: {}};
			result.push(resultItem);
		}
		let key = change.key;

		const re = /\$\[(\$oid:)?([0-9a-f]+)\]/;
		if (re.test(key)) {
			resultItem.options = resultItem.options || {arrayFilters: []};
			let match;
			while (match = re.exec(key)) {   // e.g.   addresses.$[234234].name > addresses.$[item1].name
				let itemName = "item" + (++filterItemIndex);
				key = key.replace(re, "$[" + itemName + "]");
				let filter = {};
				filter[itemName + "._id"] = match[1] ? new ObjectId(match[2]) : parseInt(match[2]);
				resultItem.options.arrayFilters.push(filter);
			}
		}

		switch (change.kind) {
			case DiffKind.added:
			case DiffKind.edited:
				resultItem.update.$set = resultItem.update.$set || {};
				resultItem.update.$set[key] = change.newVal;
				break;

			case DiffKind.deleted:
				resultItem.update.$unset = resultItem.update.$unset || {};
				resultItem.update.$unset[key] = "";
				break;

			case DiffKind.arrayAdded:
				resultItem.update.$set = resultItem.update.$set || {};
				resultItem.update.$set[key] = change.newVal;
				break;

			case DiffKind.arrayDeleted:
				resultItem.update.$unset = resultItem.update.$unset || {};
				resultItem.update.$unset[key] = "";
				break;
		}
	}
	return result;
}
