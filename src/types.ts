export class DiffConfig {

}

export class MongoPatchWithIdChange {
	query: any;
	update: any = {};
	options?: any;
}

export class Change {
	constructor(path: any, key: string) {
		this.path = path;
		this.key = key;
	}

	path: any;
	key: string;
	oldVal: any;
	newVal: any;
	kind?: DiffKind;
}

export enum ResultModel {
	MongoPatch = 1,
	Restful = 2,
	ChangeSet = 3,
}

export enum DiffKind {
	added = 'N',
	edited = 'E',
	deleted = 'D',
	arrayAdded = 'AN',
	arrayDeleted = 'AD'
}
