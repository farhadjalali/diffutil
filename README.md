# diffutil

**diffutil** compares two objects and extracts the differences. It supports different result structure in order to use for Restful APIs, or MongoDB patches and etc.

## Install

```bash
npm install diffutil
```

## Features

* Get the structural differences between two objects.
* Observe the structural differences between two objects.
* Supports different result structure based on different needs such as Restful APIs, or MongoDB patches.

### Importing

#### nodejs

```javascript
var diff = require('diffutil')
// or:
// const diff = require('diffutil');
// const { diff } = require('diffutil');
// es6+:
// import diff from 'diffutil';
```

## Examples

You can find more samples in **main.test.ts**.

``` javascript
const {diff} = require('./main');

let _id = new ObjectId();
let oldDoc = {_id, month: "may"};  
let newDoc = {_id, month: "april"};  
let result = diff(oldDoc, newDoc);
// result :  [{query: {_id}, update: {$set: {month: "april"}}}]
```

## Arrays update

``` javascript

let _id = new ObjectId();
let item1Id = new ObjectId();
let item2Id = new ObjectId();
let oldDoc = {_id, addresses: [{_id: item1Id, city: "London"}]};
let newDoc = {_id, addresses: [{_id: item1Id, city: "Sydney"}, {_id: item2Id, city: "Paris"}]};

let result = diff(oldDoc, newDoc);
// result :   
//    [{
//      query: {_id},
//      update: {
//           $set: {"addresses.$[item1].city": "Sydney", "addresses.$[item2]": {_id: item2Id, city: "Paris"}},
//      },
//      options: {
//        arrayFilters: [{"item1._id": item1Id}, {"item2._id": item2Id}]
//      }
//   }];
```
