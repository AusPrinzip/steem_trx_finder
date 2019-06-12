const dsteem         = require('dsteem')
const client         = new dsteem.Client('https://api.steemit.com')
const MIN            = 60 * 1000
const SEC            = 1000
const  sec_per_block = 3

var first_run        = true

var d                = new Date()
var n                = d.getTimezoneOffset() * MIN

var post_created     = ''

function start (author, permlink, blockNum) {
	return new Promise(async (resolve, reject) => {
		let block = {}
		if (first_run) {
			// console.log('first run')
			let res      = await client.database.call('get_content', [author, permlink])
			post_created = res.created
			post_created = new Date(Date.parse(post_created) - n)
			
			block        = await client.blockchain.getCurrentBlockHeader()
			blockNum     = await client.blockchain.getCurrentBlockNum()
			first_run    = false
		} else {
			block = await client.database.getBlockHeader(blockNum)
		}
		// console.log('\n ** blockNum = ' + blockNum + ' **')
		let block_time = new Date(Date.parse(block.timestamp) - n)
		let timediff = (block_time - post_created) / 1000
		// console.log('timediff = ' + timediff + ' sec')
		if (timediff > 3) {
			let block_delta = timediff / sec_per_block
			console.log('block_delta = ' + block_delta)
			return start(author, permlink, blockNum - block_delta).then((res) => { return resolve(res)})
		} else if (timediff < 0) {
			let block_delta = timediff / sec_per_block
			console.log('block_delta = ' + block_delta)
			return start(author, permlink, blockNum - block_delta).then((res) => { return resolve(res)})
		} else {
			console.log('bingo, origin TRX has been found')
			let block = await client.database.getBlock(blockNum + 1)
			let trxs = block.transactions
			trxs.forEach((trx) => {
				trx.operations.forEach((op) => {
					if (op[0] == 'comment') {
						// console.log(op[1].permlink)
						if (op[1].permlink == permlink) {
							// console.log('bingo, permlink has been found')
							// console.log(op[1].permlink)
							trx.operations.forEach((op) => {
								if (op[0] == 'custom_json' && op[1].id == 'likwid-beneficiary') {
									let json = JSON.parse(op[1].json)
									// console.log(json)
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
			return resolve()
		}
	})
}

module.exports = {
	start: start
}

