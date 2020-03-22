const http = require('http')
const fs = require('fs')
const path = require('path')
const ws = require('ws')
const express = require('express')

const port = 9095

const app = express()
const server = http.createServer(app)
const wss = new ws.Server({server})

const pixelData = [
	['red','green','bule'],
	['cyan','green','brown'],
]

wss.on('connection',(ws, req) => {
	ws.send(JSON.stringify({
		type: 'init',
		pixelData: pixelData,
	}))
	ws.on('message', msg => {
		msg = JSON.parse(msg)
		if (msg.type == 'drawDot') {
			pixelData[msg.y][msg.x] = msg.color
			wss.clients.forEach(client => {
				client.send(JSON.stringify({
					type: 'updateDot',
					x:msg.x,
					y:msg.y,
					color:msg.color
				}))
			})
		}
	})
})

app.use(express.static(path.join(__dirname,'./static'))) 

server.listen(port, () => {
	console.log('server listening on port', port)
})