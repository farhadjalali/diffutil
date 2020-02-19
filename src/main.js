"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const bson_1 = require("bson");
const types_1 = require("./types");
const idName = "_id";
function getArrayChanges(oldArray, newArray, path, keyPrefix) {
    let changes = [];
    if (_.some(oldArray, item => !item[idName]) || _.some(newArray, item => !item[idName])) {
        let minLength = Math.min(newArray.length, oldArray.length);
        for (let i = 0; i < minLength; i++) {
            let innerChanges = getChanges(oldArray[i], newArray[i], path, keyPrefix + i + ".");
            changes.push(...innerChanges);
        }
        if (newArray.length > oldArray.length)
            for (let i = minLength; i < newArray.length; i++) {
                let change = new types_1.Change(path, keyPrefix + i);
                change.kind = types_1.DiffKind.arrayAdded;
                change.newVal = newArray[i];
                changes.push(change);
            }
        else
            for (let i = minLength; i < oldArray.length; i++) {
                let change = new types_1.Change(path, keyPrefix + i);
                change.kind = types_1.DiffKind.arrayDeleted;
                change.oldVal = oldArray[i];
                changes.push(change);
            }
    }
    else {
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
            if (oldItem == undefined) {
                let change = new types_1.Change(path, itemKeyPrefix);
                change.kind = types_1.DiffKind.arrayAdded;
                change.newVal = newItem;
                changes.push(change);
            }
            else if (newItem == undefined) {
                let change = new types_1.Change(path, itemKeyPrefix);
                change.kind = types_1.DiffKind.arrayDeleted;
                change.oldVal = oldItem;
                changes.push(change);
            }
            else {
                let innerChanges = getChanges(oldItem, newItem, path, itemKeyPrefix + ".");
                changes.push(...innerChanges);
            }
        }
    }
    return changes;
}
function isObjectId(value) {
    return value._bsontype == "ObjectID";
}
function getChanges(oldDoc, newDoc, path, keyPrefix) {
    let changes = [];
    let oldKeys = Object.keys(oldDoc);
    let newKeys = Object.keys(newDoc);
    let keys = _.union(oldKeys, newKeys);
    let compareBasedOnId = oldDoc[idName] && newDoc[idName];
    if (compareBasedOnId) {
        keys = keys.filter(key => key !== idName);
        if (!path)
            path = newDoc["_id"];
    }
    for (let key of keys) {
        let oldVal = oldDoc[key];
        let newVal = newDoc[key];
        let change = new types_1.Change(path, keyPrefix + key);
        if (oldVal == undefined && Array.isArray(newVal))
            oldVal = [];
        if (oldVal == undefined) {
            change.kind = types_1.DiffKind.added;
            change.newVal = newVal;
            changes.push(change);
        }
        else if (newVal == undefined) {
            change.kind = types_1.DiffKind.deleted;
            change.oldVal = oldVal;
            changes.push(change);
        }
        else {
            change.kind = types_1.DiffKind.edited;
            change.newVal = newVal;
            change.oldVal = oldVal;
            if (Array.isArray(newVal) && Array.isArray(oldVal)) {
                let arrayChanges = getArrayChanges(oldVal, newVal, path, change.key + ".");
                changes.push(...arrayChanges);
            }
            else if (_.isObject(newVal)) {
                if (_.isObject(oldVal)) {
                    let innerChanges = getChanges(oldVal, newVal, path, change.key + ".");
                    changes.push(...innerChanges);
                }
                else {
                    changes.push(change);
                }
            }
            else {
                if (_.isObject(oldVal)) {
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
    if (!_.isObject(oldDoc) || !_.isObject(newDoc))
        return oldDoc === newDoc;
    let changes = getChanges(oldDoc, newDoc, null, "");
    switch (model) {
        case types_1.ResultModel.MongoPatch:
            return mergeChangesOnMongoPatchWithId(changes);
        case types_1.ResultModel.Restful:
            throw "'Restful' is not implemented yet";
        case types_1.ResultModel.ChangeSet:
            return changes;
    }
}
exports.diff = diff;
function mergeChangesOnMongoPatchWithId(changes) {
    let result = [];
    let filterItemIndex = 0;
    for (let change of changes) {
        let resultItem = _.find(result, ch => ch.query._id.equals(change.path));
        if (!resultItem) {
            resultItem = { query: { _id: change.path }, update: {} };
            result.push(resultItem);
        }
        let key = change.key;
        const re = /\$\[(\$oid:)?([0-9a-f]+)\]/;
        if (re.test(key)) {
            resultItem.options = resultItem.options || { arrayFilters: [] };
            let match;
            while (match = re.exec(key)) {
                let itemName = "item" + (++filterItemIndex);
                key = key.replace(re, "$[" + itemName + "]");
                let filter = {};
                filter[itemName + "._id"] = match[1] ? new bson_1.ObjectId(match[2]) : parseInt(match[2]);
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
                resultItem.update.$set = resultItem.update.$set || {};
                resultItem.update.$set[key] = change.newVal;
                break;
            case types_1.DiffKind.arrayDeleted:
                resultItem.update.$unset = resultItem.update.$unset || {};
                resultItem.update.$unset[key] = "";
                break;
        }
    }
    return result;
}
//# sourceMappingURL=main.js.map