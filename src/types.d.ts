export declare function diff(oldDoc: any, newDoc: any, model?: ResultModel): any;

declare class MongoUpdateParams {
    query: any;
    update: any;
    options?: any;
}
declare class Change {
    constructor(path: any, key: string);
    path: any;
    key: string;
    oldVal: any;
    newVal: any;
    kind?: DiffKind;
}
declare enum ResultModel {
    MongoPatch = 1,
    Restful = 2,
    ChangeSet = 3
}
declare enum DiffKind {
    added = "N",
    edited = "E",
    deleted = "D",
    arrayAdded = "AN",
    arrayDeleted = "AD"
}
