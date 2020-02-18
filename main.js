"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const Types_1 = require("./Types");
const idName = "_id";
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
        let set = {};
        set[key] = newVal;
        let change = new Types_1.Change();
        change.path = path;
        change.key = keyPrefix + key;
        if (oldVal == undefined) {
            change.kind = Types_1.DiffKind.added;
            change.newVal = newVal;
        }
        else if (newVal == undefined) {
            change.kind = Types_1.DiffKind.deleted;
            change.oldVal = oldVal;
        }
        else {
            change.kind = Types_1.DiffKind.edited;
            change.newVal = newVal;
            change.oldVal = oldVal;
            if (_.isObject(newVal)) {
                if (_.isObject(oldVal)) {
                    let innerChanges = getChanges(oldVal, newVal, path, change.key + ".");
                    changes.push(...innerChanges);
                    continue;
                }
                else {
                }
            }
            else {
                if (_.isObject(oldVal)) {
                }
                else {
                    if (oldVal === newVal)
                        continue;
                }
            }
        }
        changes.push(change);
    }
    return changes;
}
function diff(oldDoc, newDoc, model = Types_1.ResultModel.MongoPatchWithId) {
    if (!_.isObject(oldDoc) || !_.isObject(newDoc))
        return oldDoc === newDoc;
    let changes = getChanges(oldDoc, newDoc, null, "");
    switch (model) {
        case Types_1.ResultModel.MongoPatchWithId:
            return mergeChangesOnMongoPatchWithId(changes);
        default:
            throw "Not implemented model!";
    }
}
exports.diff = diff;
function mergeChangesOnMongoPatchWithId(changes) {
    let result = [];
    for (let change of changes) {
        let item = _.find(result, ch => ch.query._id.equals(change.path));
        if (!item) {
            item = { query: { _id: change.path }, update: {} };
            result.push(item);
        }
        switch (change.kind) {
            case Types_1.DiffKind.added:
            case Types_1.DiffKind.edited:
                item.update.$set = item.update.$set || {};
                item.update.$set[change.key] = change.newVal;
                break;
            case Types_1.DiffKind.deleted:
                item.update.$unset = item.update.$unset || {};
                item.update.$unset[change.key] = "";
                break;
        }
    }
    return result;
}
//# sourceMappingURL=main.js.map