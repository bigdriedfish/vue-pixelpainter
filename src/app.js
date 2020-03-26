const http = require('http')
const fs = require('fs')
const path = require('path')
const ws = require('ws')
const express = require('express')

const port = 9095

const app = express()
const server = http.createServer(app)
const wss = new ws.Server({server})

const width = 50
const height = 30
let pixelData 

try {
	pixelData = require('./pixel.json')
} catch (error) {
	pixelData = new Array(height).fill(0).map(it => new Array(width).fill(0))
}
//缓存到本地
setInterval(() => {
	fs.writeFile(path.join(__dirname, './pixel.json'),JSON.stringify(pixelData), (err) => {
		console.log("data saved!")
	})
}, 3000)

wss.on('connection',(ws, req) => {
	ws.send(JSON.stringify({
		type: 'init',
		pixelData: pixelData,
	}))

	var lastDraw = 0

	ws.on('message', msg => {
		msg = JSON.parse(msg)
		var now = Date.now()
		var {x, y, color} = msg
		//限制绘制次数
		if (msg.type == 'drawDot') {
			if (now - lastDraw < 1000) {
				return 
			}

			if (x > 0 && y > 0 && x < width && y < height) {
				lastDraw = now 
				pixelData[y][x] = color
				wss.clients.forEach(client => {
					client.send(JSON.stringify({
						type: 'updateDot',
						x, y, color
					}))
				})
			}
		}
	})
})

app.use(express.static(path.join(__dirname,'./static'))) 

server.listen(port, () => {
	console.log('server listening on port', port)
})