
const MIN            = 60 * 1000
const SEC            = 1000
const  sec_per_block = 3
const YEAR 			 = 12 * 30 * 24 * 60 * 60 * 1000

var d                = new Date()
var n                = d.getTimezoneOffset() * MIN

var post_created     = ''

function findCommentTrx (client, author, permlink, blockNum, last_block_delta) {
	return new Promise((resolve, reject) => {
		let block     = {}
		if (!blockNum) {
			client.database.call('get_content', [author, permlink])
			.then(async (res) => {
				post_created = res.created
				post_created = new Date(Date.parse(post_created) - n)
				let post_age = new Date() - new Date(post_created)

				if (post_age > 3 * YEAR) return reject('post date error: older than 3 years')

				block        = await client.blockchain.getCurrentBlockHeader()
				blockNum     = await client.blockchain.getCurrentBlockNum()
				first_run    = false
			})
		} else {
			client.database.getBlockHeader(blockNum)
			.then((res) => block = res)
		}
		let block_time = new Date(Date.parse(block.timestamp) - n)
		let timediff = (block_time - post_created) / 1000
		if (timediff > 3) {
			let block_delta = timediff / sec_per_block
			console.log('block_delta = ' + block_delta)
			return findCommentTrx(client, author, permlink, blockNum - block_delta, block_delta).then((res) => { return resolve(res)})
		} else if (timediff < 0) {
			let block_delta = timediff / sec_per_block
			console.log('block_delta = ' + block_delta)
			if (block_delta == -last_block_delta) {
				console.log(blockNum)
				console.log(blockNum - block_delta)
				console.log('** loop detected **')
				block_delta++
			}
			return findCommentTrx(client, author, permlink, blockNum - block_delta, block_delta).then((res) => { return resolve(res)})
		} else {
			console.log('origin BLOCK has been found')
			client.database.getBlock(blockNum + 1)
			.then((res) => {
				block = res
				let trxs = block.transactions
				trxs.forEach((trx) => {
					trx.operations.forEach((op) => {
						if (op[0] == 'comment') {
							if (op[1].permlink == permlink) {
								console.log('bingo, TRX has been found')
								trx.operations.forEach((op) => {
									if (op[0] == 'custom_json' && op[1].id == 'likwid-beneficiary') {
										let json = JSON.parse(op[1].json)
										let beneficiaries = []
										try {
											beneficiaries = json.beneficiaries
										} catch(e) {
											console.log(e)
											return reject('custom_json detected but missing beneficiaries array')
										}
										return resolve(beneficiaries)
									}
								})
							}
						}
					})
				})
			})
			console.log('trx could not be found')
			return resolve()
		}
	})
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
						return resolve(trx)
					}
				}
			})
		})
		return reject()
	})
}

module.exports = {
	findCommentTrx: findCommentTrx,
	findVoteTrx: findVoteTrx
}

