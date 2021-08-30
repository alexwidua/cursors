import React, { useState, useEffect } from 'react'
import socketIOClient from 'socket.io-client'
import styled from 'styled-components'

import { getRandomNumberInRange } from './utils/number'

import Heading from './components/layout//Heading'
import Cursor from './components/Cursor'
import DrawAndAnnotate from './components/DrawAnnotate'
import Gesture from './components/Gesture'
import PingMessage from './components/RadialMenu'
import PingContextual from './components/ContextualPing'

const SOCKET_SRV = process.env.APP_LOCAL_IP + ':' + process.env.APP_LOCAL_PORT
const SOCKET = socketIOClient(SOCKET_SRV)

const CONTENT_MAX_WIDTH = 800
const THROTTLE_TRESHOLD = 25 // throttle treshold in ms

// Used to initialize client obj with default values
const INIT_CLIENT_DATA = {
	x: 0,
	y: 0,
	preventUpdate: false,
	pointer: {
		down: false,
		ctrl: false,
		type: false
	},
	clientBounds: {
		height: 0,
		width: 0
	},
	cursorIsInViewport: true,
	lastEmittedMessage: ''
}

function App() {
	const [localClient, setLocalClient] = useState({
		id: false,
		x: 0,
		y: 0,
		preventUpdate: false,
		pointer: {
			down: false,
			ctrl: false,
			type: false
		}
	})
	const [lastEmitToServer, setLastEmitToServer] = useState(0)
	// All connected clients
	const [clients, setClients] = useState({})

	// Single features
	const [lastReceivedPingMessage, setLastReceivedPingMessage] = useState({
		id: null,
		index: -1
	})
	const [lastContextualPing, setLastContextualPing] = useState({
		id: null,
		type: null
	})

	const [lastReceivedGesture, setLastReceivedGesture] = useState({
		id: null,
		gesture: null,
		num: 0
	})

	/**
	 * 👂 The main 'SOCKET hook' that listens to SOCKET events emitted from ./srv
	 */
	useEffect(() => {
		/**
		 * Initializes local client after joining
		 *
		 * 1. Assign local ID to later hide local cursor
		 * 2. Fetches list of all connected clients and pushes them to local state
		 */
		SOCKET.on('initialize_local_client', (data) => {
			setLocalClient((prev) => ({ ...prev, id: data.id }))
			data.clients.forEach((item) => {
				if (item.id !== data.id) {
					setClients((prev) => ({
						...prev,
						[item.id]: {
							name: item.name,
							color: item.color,
							...INIT_CLIENT_DATA
						}
					}))
				}
			})
			/**
			 * Add new connected remote client to client list
			 */
			SOCKET.on('broadcast_new_connected_client', (data) => {
				setClients((prev) => ({
					...prev,
					[data.id]: {
						name: data.name,
						color: data.color,
						...INIT_CLIENT_DATA
					}
				}))
			})
			/**
			 * (Since properties technically cannot be deleted from useState,
			 * we set the property to undefined and check for undefined later)
			 */
			SOCKET.on('broadcast_dropped_client', (id) => {
				setClients((prev) => ({
					...prev,
					[id]: undefined
				}))
			})

			/**
			 * Handle receiving cursor movement of 'remote' cursors
			 */
			SOCKET.on('broadcast_update_cursor_move', (data) => {
				console.log('Yo')
				// Naive interpolation between different browser widths
				// to make sure that remote cursor has correct position
				const localWidth = Math.max(
					(window.innerWidth - CONTENT_MAX_WIDTH) / 2,
					0
				)
				const remoteWidth = Math.max(
					(data.clientBounds.width - CONTENT_MAX_WIDTH) / 2,
					0
				)
				const interpolatedX = localWidth - remoteWidth

				setClients((prev) => ({
					...prev,
					[data.id]: {
						...prev[data.id],
						x: data.x + interpolatedX,
						y: data.y,
						pointer: data.pointer,
						clientBounds: data.clientBounds
					}
				}))
			})

			/**
			 * Handle focus/blur of remove cursors
			 */
			SOCKET.on('broadcast_update_cursor_in_viewport', (data) => {
				setClients((prev) => ({
					...prev,
					[data.id]: {
						...prev[data.id],
						cursorIsInViewport: data.active
					}
				}))
			})

			/**
			 * Cursor chat
			 */
			SOCKET.on('broadcast_update_chat_message', (data) => {
				// 1. Pass message to according child
				setClients((prev) => ({
					...prev,
					[data.id]: {
						...prev[data.id],
						lastEmittedMessage: data.msg
					}
				}))
			})

			/**
			 * Handle received pings
			 */
			SOCKET.on('broadcast_update_ping_message', (data) => {
				setLastReceivedPingMessage({
					id: data.id,
					index: data.index,
					rotation: getRandomNumberInRange(40)
				})
			})

			SOCKET.on('broadcast_update_contextual_ping', (data) => {
				setLastContextualPing({
					id: data.id,
					type: data.type
				})
			})

			/**
			 * Gestures
			 */
			SOCKET.on('broadcast_update_cursor_gesture', (data) => {
				setLastReceivedGesture({
					id: data.id,
					gesture: data.gesture,
					offsetX: getRandomNumberInRange(100) // offset messages by -100..100 px
				})
			})
		})
	}, [SOCKET])

	/**
	 * Methods
	 */

	/**
	 * Emit event if local clients loses focus of window
	 */
	const handleCursorEnterViewport = () => {
		SOCKET.emit('handle_update_cursor_in_viewport', {
			active: true
		})
	}
	const handleCursorLeaveViewport = () => {
		SOCKET.emit('handle_update_cursor_in_viewport', {
			active: false
		})
	}

	/**
	 * Handle cursor move event
	 */
	const handleCursorMove = (e) => {
		const now = Date.now()
		// Throttle emit
		if (
			now - lastEmitToServer > THROTTLE_TRESHOLD &&
			!localClient.preventUpdate
		) {
			setLocalClient((prev) => ({
				...prev,
				x: e.pageX,
				y: e.pageY
			}))
			SOCKET.emit('handle_update_cursor_move', {
				x: e.pageX,
				y: e.pageY,
				pointer: {
					down: localClient.pointer.down,
					type: localClient.pointer.type
				},
				clientBounds: {
					height: window.innerHeight,
					width: window.innerWidth
				}
			})
			setLastEmitToServer(now)
		}
	}

	/**
	 * Handle cursor down/up event
	 */
	const handleMouseDown = (e) => {
		// Prevent middle click default event since various features rely on middle click
		if (e.button === 1) {
			e.preventDefault()
		}
		setLocalClient((prev) => ({
			...prev,
			pointer: { down: true, ctrl: e.ctrlKey, type: e.button }
		}))
	}
	const handleMouseUp = (e) => {
		setLocalClient((prev) => ({
			...prev,
			pointer: { down: false, ctrl: false, type: e.button }
		}))
	}

	/**
	 * Handle chat events
	 */

	const handleChatMessage = (msg) => {
		SOCKET.emit('handle_update_chat_message', {
			msg
		})
	}

	/**
	 * Handle menu open & ping event
	 */

	const handleMenuOpen = (state) => {
		setLocalClient((prev) => ({
			...prev,
			preventUpdate: state
		}))
	}

	const handlePingEvent = (data) => {
		SOCKET.emit('handle_update_ping_message', {
			index: data.index
		})
	}

	const handleContextualPing = (type) => {
		SOCKET.emit('handle_update_contextual_ping', {
			type
		})
	}

	const handleGesture = (gesture) => {
		SOCKET.emit('handle_update_cursor_gesture', {
			gesture
		})
	}

	return (
		<Wrapper
			onMouseEnter={handleCursorEnterViewport}
			onMouseLeave={handleCursorLeaveViewport}
			onMouseMove={handleCursorMove}
			onMouseDown={handleMouseDown}
			onMouseUp={handleMouseUp}
			style={{ '--content-max-width': `${CONTENT_MAX_WIDTH}px` }}>
			<Container>
				<h1>Cursors</h1>
				<p>
					This is a short intro. Lorem ipsum dolor sit amet,
					consectetur adipiscing elit. Pellentesque bibendum hendrerit
					imperdiet.
				</p>
				<p>
					Nunc tincidunt nulla eu porttitor posuere. Mauris et urna
					nulla. Morbi hendrerit porttitor erat. Mauris vel est eu
					erat malesuada faucibus at et nisl. Vestibulum gravida
					tellus ut ex luctus, et volutpat augue vestibulum.
				</p>
				{/* Local cursor */}
				<Cursor
					isLocal
					position={{ x: localClient.x, y: localClient.y }}
					lastEmittedGesture={
						lastReceivedGesture.id === 'LOCAL_CLIENT' &&
						lastReceivedGesture
					}
					onEmitMessage={handleChatMessage}
				/>
				{/* Map all connected remote cursors */}
				{Object.keys(clients).map((id, i) => {
					if (typeof clients[id] !== 'undefined') {
						return (
							<Cursor
								key={i}
								id={id}
								clientName={clients[id].name}
								position={{
									x:
										clients[id].x < window.innerWidth
											? clients[id].x
											: window.innerWidth,
									y:
										clients[id].y < window.innerHeight
											? clients[id].y
											: window.innerHeight
								}}
								color={clients[id].color}
								cursorIsInViewport={
									clients[id].cursorIsInViewport
								}
								lastEmittedMessage={
									clients[id].lastEmittedMessage
								}
								lastEmittedGesture={
									lastReceivedGesture.id === id &&
									lastReceivedGesture
								}
								onEmitMessage={handleChatMessage}
							/>
						)
					}
				})}
				{/* 01 Annotations */}
				<article>
					<Heading index={1} sup={'Explicit'}>
						Annotations
					</Heading>
					<p>
						Nunc tincidunt nulla eu porttitor posuere. Mauris et
						urna nulla. Morbi hendrerit porttitor erat. Mauris vel
						est eu erat malesuada faucibus at et nisl. Vestibulum
						gravida tellus ut ex luctus, et volutpat augue
						vestibulum.
					</p>
					<DrawAndAnnotate
						clients={{ LOCAL_CLIENT: localClient, ...clients }}
					/>
				</article>
				<article>
					<Heading index={2} sup={'Explicit'}>
						Messages
					</Heading>
					<p>
						Nunc tincidunt nulla eu porttitor posuere. Mauris et
						urna nulla. Morbi hendrerit porttitor erat. Mauris vel
						est eu erat malesuada faucibus at et nisl. Vestibulum
						gravida tellus ut ex luctus, et volutpat augue
						vestibulum.
					</p>
				</article>
				<article>
					<Heading index={3} sup={'Explicit + Implicit'}>
						Pings
					</Heading>
					<p>
						Nunc tincidunt nulla eu porttitor posuere. Mauris et
						urna nulla. Morbi hendrerit porttitor erat. Mauris vel
						est eu erat malesuada faucibus at et nisl. Vestibulum
						gravida tellus ut ex luctus, et volutpat augue
						vestibulum.
					</p>
					<PingMessage
						clients={{ LOCAL_CLIENT: localClient, ...clients }}
						localCursorPosition={localClient}
						localCursorProps={localClient.pointer}
						localClient={localClient}
						lastReceivedPingMessage={lastReceivedPingMessage}
						onMenuOpen={handleMenuOpen}
						onPingEvent={handlePingEvent}
					/>
				</article>
				<article>
					<Heading index={4} sup={'Explicit'}>
						Contextual
					</Heading>
					<p>
						Nunc tincidunt nulla eu porttitor posuere. Mauris et
						urna nulla. Morbi hendrerit porttitor erat. Mauris vel
						est eu erat malesuada faucibus at et nisl. Vestibulum
						gravida tellus ut ex luctus, et volutpat augue
						vestibulum.
					</p>
					<PingContextual
						clients={{ LOCAL_CLIENT: localClient, ...clients }}
						lastContextualPing={lastContextualPing}
						onContextualPing={handleContextualPing}
					/>
				</article>

				<article>
					<Heading index={5} sup={'Implicit'}>
						Gestures
					</Heading>
					<p>
						Nunc tincidunt nulla eu porttitor posuere. Mauris et
						urna nulla. Morbi hendrerit porttitor erat. Mauris vel
						est eu erat malesuada faucibus at et nisl. Vestibulum
						gravida tellus ut ex luctus, et volutpat augue
						vestibulum.
					</p>
					<Gesture
						position={localClient}
						pointerDown={localClient.pointerDown}
						onGesture={handleGesture}
					/>
				</article>
			</Container>
		</Wrapper>
	)
}

const Wrapper = styled.div`
	position: relative;
	width: 100%;
	min-height: 100vh;
	padding: 64px;
	border: 1px solid blue;
`

const Container = styled.div`
	max-width: var(--content-max-width);
	margin: 0 auto;
	background: #fff;
	/* border: 1px red solid; */
`

export default App
