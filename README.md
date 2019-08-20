
## Purpose

STEEM rpc-api  database call `get_account_history` does provide only a *pseudo-transaction* object. This is the form of the returned object:
```
[
  31896,
  {
    trx_id: '268de18b9d381eeaa71419c1454f5f229c785235',
    block: 35683670,
    trx_in_block: 19,
    op_in_trx: 0,
    virtual_op: 0,
    timestamp: '2019-08-19T08:15:21',
    op: [ 'vote', [Object] ]
  }
]
```
This pseudo-transaction object is missing valuable information such as: 
* Signature
* extensions
* expiration
* ref_block_num
* ref_block_prefix

If you need the full trx object, this library will help you.

## Use 

This library has been design with async requests in mind. 

If you want to initialise a dsteem client:
```
var dsteem = require('dsteem')
var client = new dsteem.client(rpc_node_address)
````

Each method call requires a client instance passed as argument.

There are two methods available:

* findCommentTrx(client, author, permlink)
* findVoteTrx(client, pseudo_trx)

## Install
```
$ npm i steemtrxfinder --save
```

## Configuration

TBD