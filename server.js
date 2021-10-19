// Set up server
//require('dotenv').config()
const server = require('http').createServer()
const port = process.env.PORT || 3000
const io = require('socket.io')(server, {
	cors: {
		origin: '*'
	}
})

// Logic

const clients = []
const name1 = ['Fancy', 'Delightful']
const name2 = ['Parrot', 'Weasel']

const colors = ['#FF6575', '#4262FF', '#58D382', '#C552B8', '#817F99']

const getName = (arr) => {
	return arr[Math.floor(Math.random() * arr.length)]
}

const addClient = (id) => {
	const name = `${getName(name1)} ${getName(name2)}`
	const color = colors[Math.floor(Math.random() * colors.length)]
	clients.push({ id, name, color })

	console.log('Client connected, ' + id)
}

const removeClient = (id) => {
	const index = clients.map((el) => el.id).indexOf(id)
	clients.splice(index, 1)
	console.log('Client disconnected, ' + id)
}

io.sockets.on('connection', (socket) => {
	// Setup
	addClient(socket.id)
	const id = socket.id
	const client = clients[clients.map((el) => el.id).indexOf(id)]
	const { name, color } = client

	// Initialize new client with data about themselves and other connected clients
	socket.emit('initialize_local_client', { id, name, color, clients })

	// Tell already connected clients about new connection
	socket.broadcast.emit('broadcast_new_connected_client', { id, name, color })

	socket.on('disconnect', () => {
		removeClient(id)
		socket.broadcast.emit('broadcast_dropped_client', id)
	})

	/**
	 * Cursor logic and features
	 */

	socket.on('handle_update_cursor_move', (data) => {
		data.id = id
		data.name = name
		socket.broadcast.emit('broadcast_update_cursor_move', data)
	})

	socket.on('handle_update_cursor_focus_blur', (data) => {
		data.id = id
		socket.broadcast.emit('broadcast_update_cursor_focus_blur', data)
	})

	socket.on('handle_update_chat_message', (data) => {
		data.id = id
		socket.broadcast.emit('broadcast_update_chat_message', data)
	})

	socket.on('handle_update_ping_message', (data) => {
		data.id = id
		socket.emit('broadcast_update_ping_message', {
			...data,
			id: 'LOCAL_CLIENT'
		})
		socket.broadcast.emit('broadcast_update_ping_message', data)
	})

	socket.on('handle_update_contextual_ping', (data) => {
		data.id = id
		socket.broadcast.emit('broadcast_update_contextual_ping', data)
	})

	socket.on('handle_update_cursor_gesture', (data) => {
		data.id = id
		socket.emit('broadcast_update_cursor_gesture', {
			...data,
			id: 'LOCAL_CLIENT'
		})
		socket.broadcast.emit('broadcast_update_cursor_gesture', data)
	})
})

server.listen(port, () => {
	console.log('Listening on port:' + port)
})
