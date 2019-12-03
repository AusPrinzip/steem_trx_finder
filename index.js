
const MIN            = 60 * 1000
const SEC            = 1000
const  sec_per_block = 3
const YEAR 			 = 12 * 30 * 24 * 60 * 60 * 1000

var d                = new Date()
var n                = d.getTimezoneOffset() * MIN

var post_created     = ''

function findBlockNumber (client, author, permlink) {
	return new Promise((resolve, reject) => {
		client.database.call('get_content', [author, permlink])
		.then((res) => {
			post_created = res.created
			post_created = new Date(Date.parse(post_created) - n)
			let post_age = new Date() - new Date(post_created)
			if (post_age > 3 * YEAR) return reject('warning: post older than 3 years')

			// block        = await client.blockchain.getCurrentBlockHeader()
			client.blockchain.getCurrentBlockNum()
			.then((blockNum) => {
				return resolve(blockNum)
			})
		})
	})
}

function findCustomJson (trx) {
	for (let k = 0; k < trx.operations.length; k++) { 
		let op = trx.operations[k]
		console.log(JSON.stringify(op))
		if (op[0] == 'custom_json' && op[1].id == 'likwid-beneficiary') {
			let json = JSON.parse(op[1].json)
			let beneficiaries = []
			try {
				beneficiaries = json.beneficiaries
			} catch(e) {
				console.log(e)
				throw new Error('custom_json detected but missing beneficiaries array')
			}
			return beneficiaries
		}
	}
}

async function findCommentTrx (client, author, permlink, blockNum, last_block_delta) {
	if (!blockNum) {
		first_run    = false
		blockNum = await findBlockNumber(client, author, permlink)
	} 
	let block = await client.database.getBlockHeader(blockNum)
	let block_time = new Date(Date.parse(block.timestamp) - n)
	let timediff = (block_time - post_created) / 1000
	if (timediff > 3) {
		let block_delta = timediff / sec_per_block
		console.log('block_delta = ' + block_delta)
		return findCommentTrx(client, author, permlink, blockNum - block_delta, block_delta).then((res) => { return res })
	} else if (timediff < 0) {
		let block_delta = timediff / sec_per_block
		console.log('block_delta = ' + block_delta)
		if (block_delta == -last_block_delta) {
			console.log(blockNum)
			console.log(blockNum - block_delta)
			console.log('** loop detected **')
			block_delta++
		}
		return findCommentTrx(client, author, permlink, blockNum - block_delta, block_delta).then((res) => { return res })
	} else {
		console.log('origin BLOCK has been found')
		block = await client.database.getBlock(blockNum + 1)
		let trxs = block.transactions
		for (let i = 0; i < trxs.length; i++) { 
			let trx = trxs[i]
			// console.log(JSON.stringify(trx))
			for (let j = 0; j < trx.operations.length; j++) { 
				let op = trx.operations[j]
				if (op[0] == 'comment' && op[1].permlink == permlink) {
					console.log('bingo, COMMENT_OP has been found')
					return findCustomJson(trx)
				}
			}
		}
		console.log('trx could not be found')
	}
}

function findVoteTrx (client, pseudo_trx) {
	client.database.getBlock(blockNum)
	.then((res) => {
		let blockNum = pseudo_trx[1].block
		block = res
		let trxs = block.transactions
		trxs.forEach((trx) => {
			trx.operations.forEach((op) => {
				if (op[0] == 'vote') {
					if ( JSON.stringify(op[1]) === JSON.stringify(pseudo_trx[1].op[1]) ) {
						return trx
					}
				}
			})
		})
		throw new Error()
	})
}


module.exports = {
	findCommentTrx: findCommentTrx,
	findVoteTrx: findVoteTrx
}

