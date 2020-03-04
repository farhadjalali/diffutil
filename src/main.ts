import {ObjectId} from "bson";
import {Change, DiffKind, ResultModel, MongoUpdateParams} from "./types";

const idName = "_id";
const distinct = (value, index, self) => {
	return self.indexOf(value) === index;
};

function getArrayChanges(oldArray: any[], newArray: any[], path: any, keyPrefix: string) {
	let changes: Change[] = [];

	if (oldArray.some(item => !item[idName]) || newArray.some(item => !item[idName])) { // Item without _id found
		let minLength = Math.min(newArray.length, oldArray.length);
		for (let i = 0; i < minLength; i++) { // Change
			let innerChanges = getChanges(oldArray[i], newArray[i], path, keyPrefix + "." + i);
			changes.push(...innerChanges);
		}
		if (newArray.length > oldArray.length)
			for (let i = minLength; i < newArray.length; i++) { // added
				let change = new Change(path, keyPrefix);
				change.kind = DiffKind.arrayAdded;
				change.newVal = newArray[i];
				changes.push(change);
			}
		else
			for (let i = minLength; i < oldArray.length; i++) { // deleted
				let change = new Change(path, keyPrefix);
				change.kind = DiffKind.arrayDeleted;
				change.oldVal = oldArray[i];
				changes.push(change);
			}
	} else { // Item with _id
		let oldIDs = oldArray.map(item => item[idName].toString());
		let newIDs = newArray.map(item => item[idName].toString());
		let IDs = oldIDs.concat(newIDs).filter(distinct);
		for (let id of IDs) {
			let oldItem = oldArray.find(item => item[idName].toString() == id);
			let newItem = newArray.find(item => item[idName].toString() == id);

			let itemKeyPrefix = keyPrefix;
			if (/^[a-f0-9]{24}$/.test(id))
				itemKeyPrefix += ".$[$oid:" + id + "]";
			else
				itemKeyPrefix += ".$[" + id + "]";

			if (oldItem == undefined) { // added item
				let change = new Change(path, keyPrefix);
				change.kind = DiffKind.arrayAdded;
				change.newVal = newItem;
				changes.push(change);
			} else if (newItem == undefined) { // deleted item
				let change = new Change(path, keyPrefix);
				change.kind = DiffKind.arrayDeleted;
				change.oldVal = oldItem;
				changes.push(change);
			} else { // edited
				let innerChanges = getChanges(oldItem, newItem, path, itemKeyPrefix);
				changes.push(...innerChanges);
			}
		}
	}

	return changes;
}

function getChanges(oldDoc: any, newDoc: any, path: any, keyPrefix: string): Change[] {
	let changes: Change[] = [];

	let oldKeys = Object.keys(oldDoc);
	let newKeys = Object.keys(newDoc);
	let keys = oldKeys.concat(newKeys).filter(distinct);

	let compareBasedOnId = oldDoc[idName] && newDoc[idName];
	if (compareBasedOnId) {
		keys = keys.filter(key => key !== idName);
		if (!path) path = newDoc[idName];
	}

	for (let key of keys) {
		let oldVal = oldDoc[key];
		let newVal = newDoc[key];

		let change = new Change(path, (keyPrefix ? keyPrefix + "." : "") + key);

		if (oldVal === undefined && Array.isArray(newVal))
			oldVal = [];

		if (oldVal === undefined) { // added property
			change.kind = DiffKind.added;
			change.newVal = newVal;
			changes.push(change);

		} else if (newVal === undefined) { // deleted property
			change.kind = DiffKind.deleted;
			change.oldVal = oldVal;
			changes.push(change);

		} else { // edited property
			change.kind = DiffKind.edited;
			change.newVal = newVal;
			change.oldVal = oldVal;

			if (Array.isArray(newVal) && Array.isArray(oldVal)) {
				let arrayChanges = getArrayChanges(oldVal, newVal, path, change.key);
				changes.push(...arrayChanges);
			} else if (newVal === Object(newVal)) {
				if (oldVal === Object(oldVal)) {
					let innerChanges = getChanges(oldVal, newVal, path, change.key);
					changes.push(...innerChanges);
				} else {
					changes.push(change);
				}
			} else {
				if (oldVal === Object(oldVal)) {
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
	if (oldDoc !== Object(oldDoc) || newDoc !== Object(newDoc))
		return oldDoc === newDoc;

	let changes = getChanges(oldDoc, newDoc, null, "");
	if (!changes || changes.length == 0)
		return null;

	switch (model) {
		case ResultModel.MongoPatch:
			return mergeChangesOnMongoPatch(changes);

		case ResultModel.ChangeSet:
			return changes;
	}
}

function mergeChangesOnMongoPatch(changes: Change[]): MongoUpdateParams[] {
	let result: MongoUpdateParams[] = [];
	for (let change of changes) {
		let key = change.key;
		let resultItem: MongoUpdateParams;

		if (change.kind != DiffKind.arrayAdded && change.kind != DiffKind.arrayDeleted)
			resultItem = result.find(ch => {
				return (
						(typeof ch.query._id == "object" && ch.query._id.equals(change.path)) ||
						(typeof ch.query._id != "object" && ch.query._id === change.path)
					)
					&& !ch.update.$pull && !ch.update.$addToSet; // search just in $set and $unset
			});

		if (!resultItem) {
			resultItem = {query: {_id: change.path}, update: {}};
			result.push(resultItem);
		}

		const re = /\$\[(\$oid:)?([0-9a-f]+)\]/;
		if (re.test(key)) {
			resultItem.options = resultItem.options || {arrayFilters: []};
			let match;
			while (match = re.exec(key)) {   // e.g.   addresses.$[234234].name > addresses.$[item1].name
				let itemName = "item" + (resultItem.options.arrayFilters.length);
				key = key.replace(re, "$[" + itemName + "]");
				let filter = {};
				filter[itemName + "." + idName] = match[1] ? new ObjectId(match[2]) : parseInt(match[2]);
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
				resultItem.update.$addToSet = {};
				resultItem.update.$addToSet[key] = change.newVal;
				break;

			case DiffKind.arrayDeleted:
				resultItem.update.$pull = {};
				resultItem.update.$pull[key] = change.oldVal[idName] ? {_id: change.oldVal[idName]} : change.oldVal;
				break;
		}
	}
	return result;
}
