const http = require('http')
const fs = require('fs')
const path = require('path')
const ws = require('ws')
const express = require('express')
const Jimp = require('jimp')

const port = 9095

const app = express()
const server = http.createServer(app)
const wss = new ws.Server({server})

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
	
	wss.on('connection',(ws, req) => {
		//首次连接发送buffer数据
		img.getBuffer(Jimp.MIME_PNG, (err, buf) => {
			if(err) {
				console.log('get buffer err', err)
			} else {
				ws.send(buf)
			}
		})
		//在线人数功能
		wss.clients.forEach(ws => {
			ws.send(JSON.stringify({
				type:'onlineCount',
				count:wss.clients.size,
			}))
		})

		ws.on('close', () => {
			wss.clients.forEach(ws => {
				ws.send(JSON.stringify({
					type:'onlineCount',
					count:wss.clients.size,
				}))
			})
		})
		var lastDraw = 0
	
		ws.on('message', msg => {
			msg = JSON.parse(msg)
			var now = Date.now()
			var {x, y, color} = msg
			//限制频繁绘制
			if (msg.type == 'drawDot') {
				if (now - lastDraw < 200) {
					return 
				}
	
				if (x > 0 && y > 0 && x < width && y < height) {
					lastDraw = now
					//绘制更新间隔标志，用于判断是否保存到本地 
					lastUpdate = now
					//后端接收坐标颜色信息，并返回给前端
					img.setPixelColor(Jimp.cssColorToHex(color), x, y)
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
}
