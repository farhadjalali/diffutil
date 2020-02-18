"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const Types_1 = require("./Types");
function diff(oldDoc, newDoc, model = Types_1.ResultModel.MongoPatchWithId) {
    if (!_.isObject(oldDoc) || !_.isObject(newDoc))
        return oldDoc === newDoc;
    switch (model) {
        case Types_1.ResultModel.MongoPatchWithId:
            return diffMongoPatchWithId(oldDoc, newDoc);
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
        if (change.kind == Types_1.DiffKind.edited) {
            if (change.newVal == undefined) {
                item.update.$unset = item.update.$unset || {};
                item.update.$unset[change.key] = "";
            }
            else {
                item.update.$set = item.update.$set || {};
                item.update.$set[change.key] = change.newVal;
            }
        }
    }
    return result;
}
function diffMongoPatchWithId(oldDoc, newDoc) {
    let changes = [];
    const idName = "_id";
    for (let key in oldDoc) {
        if (key === idName)
            continue;
        let oldVal = oldDoc[key];
        let newVal = newDoc[key];
        let set = {};
        set[key] = newVal;
        let change = { path: oldDoc._id, key, newVal: newVal, oldVal: oldVal, kind: Types_1.DiffKind.edited };
        changes.push(change);
        if (_.isObject(newVal)) {
            if (!_.isObject(oldVal)) {
            }
            else {
            }
        }
        else {
            if (_.isObject(oldVal)) {
            }
            else {
            }
        }
    }
    return mergeChangesOnMongoPatchWithId(changes);
}
exports.diffMongoPatchWithId = diffMongoPatchWithId;
//# sourceMappingURL=main.js.map