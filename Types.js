"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DiffConfig {
}
exports.DiffConfig = DiffConfig;
class MongoPatchWithIdChange {
    constructor() {
        this.update = {};
    }
}
exports.MongoPatchWithIdChange = MongoPatchWithIdChange;
class Change {
}
exports.Change = Change;
var ResultModel;
(function (ResultModel) {
    ResultModel[ResultModel["MongoPatchWithId"] = 1] = "MongoPatchWithId";
})(ResultModel = exports.ResultModel || (exports.ResultModel = {}));
var DiffKind;
(function (DiffKind) {
    DiffKind["newlyAdded"] = "N";
    DiffKind["edited"] = "E";
    DiffKind["deleted"] = "D";
    DiffKind["arrayChange"] = "A";
})(DiffKind = exports.DiffKind || (exports.DiffKind = {}));
//# sourceMappingURL=Types.js.map