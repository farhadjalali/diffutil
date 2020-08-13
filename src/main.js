"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diff = void 0;
const bson_1 = require("bson");
const types_1 = require("./types");
const idName = "_id";
const distinct = (value, index, self) => {
    return self.indexOf(value) === index;
};
function getArrayChanges(oldArray, newArray, path, keyPrefix) {
    let changes = [];
    if (oldArray.some(item => !item[idName]) || newArray.some(item => !item[idName])) {
        let minLength = Math.min(newArray.length, oldArray.length);
        for (let i = 0; i < minLength; i++) {
            let innerChanges = getChanges(oldArray[i], newArray[i], path, keyPrefix + "." + i);
            changes.push(...innerChanges);
        }
        if (newArray.length > oldArray.length)
            for (let i = minLength; i < newArray.length; i++) {
                let change = new types_1.Change(path, keyPrefix);
                change.kind = types_1.DiffKind.arrayAdded;
                change.newVal = newArray[i];
                changes.push(change);
            }
        else
            for (let i = minLength; i < oldArray.length; i++) {
                let change = new types_1.Change(path, keyPrefix);
                change.kind = types_1.DiffKind.arrayDeleted;
                change.oldVal = oldArray[i];
                changes.push(change);
            }
    }
    else {
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
            if (oldItem == undefined) {
                let change = new types_1.Change(path, keyPrefix);
                change.kind = types_1.DiffKind.arrayAdded;
                change.newVal = newItem;
                changes.push(change);
            }
            else if (newItem == undefined) {
                let change = new types_1.Change(path, keyPrefix);
                change.kind = types_1.DiffKind.arrayDeleted;
                change.oldVal = oldItem;
                changes.push(change);
            }
            else {
                let innerChanges = getChanges(oldItem, newItem, path, itemKeyPrefix);
                changes.push(...innerChanges);
            }
        }
    }
    return changes;
}
function getChanges(oldDoc, newDoc, path, keyPrefix) {
    let changes = [];
    let oldKeys = Object.keys(oldDoc);
    let newKeys = Object.keys(newDoc);
    let keys = oldKeys.concat(newKeys).filter(distinct);
    let compareBasedOnId = oldDoc[idName] && newDoc[idName];
    if (compareBasedOnId) {
        keys = keys.filter(key => key !== idName);
        if (!path)
            path = newDoc[idName];
    }
    for (let key of keys) {
        let oldVal = oldDoc[key];
        let newVal = newDoc[key];
        let change = new types_1.Change(path, (keyPrefix ? keyPrefix + "." : "") + key);
        if (oldVal === undefined && Array.isArray(newVal))
            oldVal = [];
        if (oldVal === undefined) {
            change.kind = types_1.DiffKind.added;
            change.newVal = newVal;
            changes.push(change);
        }
        else if (newVal === undefined) {
            change.kind = types_1.DiffKind.deleted;
            change.oldVal = oldVal;
            changes.push(change);
        }
        else {
            change.kind = types_1.DiffKind.edited;
            change.newVal = newVal;
            change.oldVal = oldVal;
            if (Array.isArray(newVal) && Array.isArray(oldVal)) {
                let arrayChanges = getArrayChanges(oldVal, newVal, path, change.key);
                changes.push(...arrayChanges);
            }
            else if (newVal && newVal === Object(newVal) && /^[a-f\d]{24}$/.test(newVal.toString())) {
                if (!oldVal || oldVal.toString() != newVal.toString())
                    changes.push(change);
            }
            else if (newVal === Object(newVal)) {
                if (oldVal === Object(oldVal)) {
                    let innerChanges = getChanges(oldVal, newVal, path, change.key);
                    changes.push(...innerChanges);
                }
                else {
                    changes.push(change);
                }
            }
            else {
                if (oldVal === Object(oldVal)) {
                    changes.push(change);
                }
                else {
                    if (oldVal !== newVal)
                        changes.push(change);
                }
            }
        }
    }
    return changes;
}
function diff(oldDoc, newDoc, model = types_1.ResultModel.MongoPatch) {
    if (oldDoc !== Object(oldDoc) || newDoc !== Object(newDoc))
        return oldDoc === newDoc;
    let changes = getChanges(oldDoc, newDoc, null, "");
    if (!changes || changes.length == 0)
        return null;
    switch (model) {
        case types_1.ResultModel.MongoPatch:
            return mergeChangesOnMongoPatch(changes);
        case types_1.ResultModel.ChangeSet:
            return changes;
    }
}
exports.diff = diff;
function mergeChangesOnMongoPatch(changes) {
    let result = [];
    for (let change of changes) {
        let key = change.key;
        let resultItem;
        if (change.kind != types_1.DiffKind.arrayAdded && change.kind != types_1.DiffKind.arrayDeleted)
            resultItem = result.find(ch => {
                return ((typeof ch.query._id == "object" && ch.query._id.equals(change.path)) ||
                    (typeof ch.query._id != "object" && ch.query._id === change.path))
                    && !ch.update.$pull && !ch.update.$addToSet;
            });
        if (!resultItem) {
            resultItem = { query: { _id: change.path }, update: {} };
            result.push(resultItem);
        }
        const re = /\$\[(\$oid:)?([0-9a-f]+)\]/;
        if (re.test(key)) {
            resultItem.options = resultItem.options || { arrayFilters: [] };
            let match;
            while (match = re.exec(key)) {
                let itemName = "item" + (resultItem.options.arrayFilters.length);
                key = key.replace(re, "$[" + itemName + "]");
                let filter = {};
                filter[itemName + "." + idName] = match[1] ? new bson_1.ObjectId(match[2]) : parseInt(match[2]);
                resultItem.options.arrayFilters.push(filter);
            }
        }
        switch (change.kind) {
            case types_1.DiffKind.added:
            case types_1.DiffKind.edited:
                resultItem.update.$set = resultItem.update.$set || {};
                resultItem.update.$set[key] = change.newVal;
                break;
            case types_1.DiffKind.deleted:
                resultItem.update.$unset = resultItem.update.$unset || {};
                resultItem.update.$unset[key] = "";
                break;
            case types_1.DiffKind.arrayAdded:
                resultItem.update.$addToSet = {};
                resultItem.update.$addToSet[key] = change.newVal;
                break;
            case types_1.DiffKind.arrayDeleted:
                resultItem.update.$pull = {};
                resultItem.update.$pull[key] = change.oldVal[idName] ? { _id: change.oldVal[idName] } : change.oldVal;
                break;
        }
    }
    return result;
}
//# sourceMappingURL=main.js.map