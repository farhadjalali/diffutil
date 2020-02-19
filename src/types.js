"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MongoUpdateParams {
}
exports.MongoUpdateParams = MongoUpdateParams;
class Change {
    constructor(path, key) {
        this.path = path;
        this.key = key;
    }
}
exports.Change = Change;
var ResultModel;
(function (ResultModel) {
    ResultModel[ResultModel["MongoPatch"] = 1] = "MongoPatch";
    ResultModel[ResultModel["Restful"] = 2] = "Restful";
    ResultModel[ResultModel["ChangeSet"] = 3] = "ChangeSet";
})(ResultModel = exports.ResultModel || (exports.ResultModel = {}));
var DiffKind;
(function (DiffKind) {
    DiffKind["added"] = "N";
    DiffKind["edited"] = "E";
    DiffKind["deleted"] = "D";
    DiffKind["arrayAdded"] = "AN";
    DiffKind["arrayDeleted"] = "AD";
})(DiffKind = exports.DiffKind || (exports.DiffKind = {}));
//# sourceMappingURL=types.js.map