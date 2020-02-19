export declare class MongoUpdateParams {
    query: any;
    update: any;
    options?: any;
}
export declare class Change {
    constructor(path: any, key: string);
    path: any;
    key: string;
    oldVal: any;
    newVal: any;
    kind?: DiffKind;
}
export declare enum ResultModel {
    MongoPatch = 1,
    Restful = 2,
    ChangeSet = 3
}
export declare enum DiffKind {
    added = "N",
    edited = "E",
    deleted = "D",
    arrayAdded = "AN",
    arrayDeleted = "AD"
}
