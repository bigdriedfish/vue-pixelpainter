const http = require('http')
const fs = require('fs')
const path = require('path')
const ws = require('ws')
const express = require('express')
const Jimp = require('jimp')
const socketIO = require('socket.io')

const port = 9095

const app = express()
const server = http.createServer(app)
const io = socketIO(server)

const width = 256
const height = 256

main()

async function main() {
	let img 
	

	try {
		img = await Jimp.read(path.join(__dirname, './pixel.png'))
	} catch (error) {
		img = new Jimp(256, 256, 0xffffffff)
	}
	//缓存到本地
	var lastUpdate = 0
	setInterval(() => {
		var now = Date.now()
		//间歇保存
		if (now - lastUpdate < 3000) {
			img.write(path.join(__dirname, './pixel.png'), ()=> {
				console.log("data saved!", now)
			})
		}
	
	}, 3000)
	//批量更新
	let userOperations = []

	if (userOperations.length) {
		setInterval(() => {
			io.emit('updateDot', userOperations)
			userOperations = []
		}, 300)
	}

	io.on('connection',(ws, req) => {
		//首次连接发送buffer数据
		img.getBuffer(Jimp.MIME_PNG, (err, buf) => {
			if(err) {
				console.log('get buffer err', err)
			} else {
				ws.emit('init', buf)
			}
		})
		//在线人数功能
		io.emit('onlineCount',{
			count:Object.keys(io.sockets.sockets).length,
		})		
		ws.on('close', () => {
			io.emit('onlineCount',{
				count:Object.keys(io.sockets.sockets).length,
			})
		})
		var lastDraw = 0
	
		ws.on('drawDot',data => {
			var now = Date.now()
			var {x, y, color} = data
			if (now - lastDraw < 200) {
				return 
			}

			if (x > 0 && y > 0 && x < width && y < height) {
				lastDraw = now
				//绘制更新间隔标志，用于判断是否保存到本地 
				lastUpdate = now
				//后端接收坐标颜色信息，并返回给前端
				img.setPixelColor(Jimp.cssColorToHex(color), x, y)
				// io.emit('updateDot', {
				// 	x, y, color
				// })
				userOperations.push({x, y, color})
			}	
		})
	})
	
	app.use(express.static(path.join(__dirname,'./static'))) 
	
	server.listen(port, () => {
		console.log('server listening on port', port)
	})
}
