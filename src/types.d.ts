export declare class MongoUpdateParams {
    _id?: any;
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
    ChangeSet = 3
}
export declare enum DiffKind {
    added = "N",
    edited = "E",
    deleted = "D",
    arrayAdded = "AN",
    arrayDeleted = "AD"
}
