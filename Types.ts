export class DiffConfig {

}

export class MongoPatchWithIdChange {
	query: any;
	update: any = {};
	filter?: any;
}

export class Change {
	path: any;
	key: any;
	oldVal: any;
	newVal: any;
	kind: DiffKind;
	unset?: any;
	filters?: [];
}

export enum ResultModel {
	MongoPatchWithId = 1,
}

export enum DiffKind {
	newlyAdded = 'N', //  // newly added property/element
	edited = 'E', // property/element was edited
	deleted = 'D', // property/element was deleted
	arrayChange = 'A'
}
