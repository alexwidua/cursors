import React, { useState, useEffect } from 'react'
import socketIOClient from 'socket.io-client'
import styled from 'styled-components'

import { getRandomNumberInRange } from './utils/number'

import Heading from './components/layout//Heading'
import Footer from './components/layout/Footer'
import Cursor from './components/Cursor'
import DrawAndAnnotate from './components/DrawAnnotate'
import Gesture from './components/Gesture'
import Ping from './components/Ping'
import ContextualPing from './components/ContextualPing'

import { CURSOR_HEIGHT, NAME_BADGE_HEIGHT } from './components/Cursor'

const HOST = 'localhost'
const PORT = process.env.PORT || 3000
const SOCKET_SRV = HOST + ':' + PORT
const SOCKET =
	process.env.NODE_ENV === 'development'
		? socketIOClient(SOCKET_SRV)
		: socketIOClient()

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
		width: 0,
		pageYOffset: 0
	},
	clientWindowIsFocused: true,
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
	const [enablePingMessages, setEnablePingMessages] = useState(true)
	const [lastReceivedPingMessage, setLastReceivedPingMessage] = useState({
		id: null,
		index: -1
	})
	const [lastContextualPing, setLastContextualPing] = useState({
		id: null,
		type: null
	})
	const [enableGestures, setEnableGestures] = useState(false)
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
			SOCKET.on('broadcast_update_cursor_focus_blur', (data) => {
				setClients((prev) => ({
					...prev,
					[data.id]: {
						...prev[data.id],
						clientWindowIsFocused: data.active
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
	const handleCursorFocus = () => {
		SOCKET.emit('handle_update_cursor_focus_blur', {
			active: true
		})
	}
	const handleCursorBlur = () => {
		SOCKET.emit('handle_update_cursor_focus_blur', {
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
					width: window.innerWidth,
					pageYOffset: window.pageYOffset
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
		if (e.button === 1 || (e.button === 0 && e.altKey)) {
			e.preventDefault()
		}
		setLocalClient((prev) => ({
			...prev,
			pointer: { down: true, ctrl: e.altKey, type: e.button }
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
			onMouseEnter={handleCursorFocus}
			onMouseLeave={handleCursorBlur}
			onMouseMove={handleCursorMove}
			onMouseDown={handleMouseDown}
			onMouseUp={handleMouseUp}
			style={{ '--content-max-width': `${CONTENT_MAX_WIDTH}px` }}>
			<Container>
				<h1>Cursors</h1>
				<h2>
					Exploring explicit and implicit communication through
					cursors
				</h2>
				<p>
					This is a small exploration about explicit and implicit
					communication in collaborative whiteboarding software (ex.{' '}
					<a
						href='https://miro.com/'
						target='_blank'
						rel='noopener noreferrer'>
						Miro
					</a>
					,{' '}
					<a
						href='https://www.figma.com/figjam/'
						target='_blank'
						rel='noopener noreferrer'>
						FigJam
					</a>
					), where cursors and how they're displayed to others play a
					key role in real-time communication with collaborators.
				</p>
				<h3>Preface</h3>
				<p>
					This exploration and demo is intended for devices with
					either mouse or trackpad input – touch gestures are not
					supported. It also works best if at least two people are
					interacting with the page – if you don't have a colleague
					handy,{' '}
					<a
						style={{
							textDecoration: 'underline',
							cursor: 'pointer'
						}}
						target='popup'
						onClick={() =>
							window.open(
								'index.html',
								'Your local friend',
								'toolbar=no, location=no, statusbar=no, menubar=no, scrollbars=1, resizable=1, width=1000, height=600'
							)
						}>
						summon a friend on your local machine
					</a>{' '}
					✨🎩
				</p>
				<h3>Expected learning outcome</h3>
				<p>
					The expected learning outcome of this exploration is to
					explore different modes of explicit and implicit
					cursor-based communication and furthermore prototype, how a
					technical implementation of each feature could look like.
					The code can be found on GitHub.
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
										clients[id].y >
										window.innerHeight + window.pageYOffset
											? window.innerHeight +
											  window.pageYOffset -
											  CURSOR_HEIGHT
											: clients[id].y + CURSOR_HEIGHT <
											  window.pageYOffset
											? window.pageYOffset
											: clients[id].y
								}}
								cursorIsInViewport={
									clients[id].y <
										window.innerHeight +
											window.pageYOffset &&
									clients[id].y + CURSOR_HEIGHT >
										window.pageYOffset
								}
								color={clients[id].color}
								clientWindowIsFocused={
									clients[id].clientWindowIsFocused
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
					<Heading index={1} sup={'Explicit ⟶ Implicit'}>
						Annotations
					</Heading>
					<p>
						Drawing annotations is an explicit action that often
						leaves little ambiguity as to what the annotation refers
						to. However, the choice of words or symbols opens up a
						lot of room for interpretation. Likewise, emotions can
						be conveyed through e.g. intensity or rhythm of strokes,
						which can make the intention of a annotation very
						implicit.
					</p>
					<Legend>
						Draw on the canvas by pressing the <kbd>Left Mouse</kbd>{' '}
						button and dragging.
					</Legend>
					<DrawAndAnnotate
						clients={{ LOCAL_CLIENT: localClient, ...clients }}
					/>
				</article>
				<article>
					<Heading index={2} sup={'Explicit + Implicit'}>
						Cursor chat
					</Heading>
					<p>
						Chat messages are one of the most common way of
						communicating with other users in digital software.
						Attaching a user's chat message to the user's cursor
						adds a spatial dimension to this form of communication.
						It allows the user to work with otherwise very implicit
						statements such as 'Look here' while pointing or
						hovering a point of interest on the canvas.
					</p>
					<p>
						While there might be previous occurences of a similar
						interaction,{' '}
						<a
							href='https://help.figma.com/hc/en-us/articles/1500004414842-Send-messages-with-cursor-chat'
							target='_blank'
							rel='noopener noreferrer'>
							'cursor chat' was popularized by Figma in early 2021
							with the introduction of FigJam
						</a>
						, a collaborative whiteboarding tool.
					</p>
					<Legend>
						Press <kbd>C</kbd> to open the chat, <kbd>Enter</kbd> to
						send a chat message or <kbd>Esc</kbd> to close the chat
						modal.
					</Legend>
				</article>
				<article>
					<Heading index={3} sup={'Explicit + Implicit'}>
						Pings
					</Heading>
					<p>
						In this exploration, Pings are ephemeral landmarks on
						the canvas which convey a message through emojis. While
						the action of setting a ping is explicit, the intention
						can be very implicit because emojis can be ambigious.
						Also the frequency or arrangment of pings can distort or
						dilute the intention.
					</p>
					<p>
						The pinged emoji can be choosen via a pie menu, which
						requires less cognitive effort and cursor movement
						compared to a linear menu (this assumption is based on a
						very small sample size, see also:{' '}
						<a
							href='https://donhopkins.medium.com/an-empirical-comparison-of-pie-vs-linear-menus-466c6fdbba4b'
							target='_blank'
							rel='noopener noreferrer'>
							Hopkins et al., 'An Empirical Comparison of Pie vs.
							Linear Menus
						</a>
						).
					</p>
					<Legend>
						Press and hold the <kbd>Middle mouse</kbd> button to
						open the ping menu. <br />
					</Legend>
					<Legend>
						Alternatively, hold the
						<kbd>Alt</kbd> / <kbd>Option</kbd> key and press the
						<kbd>Left Mouse</kbd> button.
					</Legend>
					<Ping
						enablePingMessages={enablePingMessages}
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
					<Heading index={4} sup={'Explicit ⟶ Implicit'}>
						Contextual Pings
					</Heading>
					<p>
						Similar to <em>Pings</em>, <em>Contextual Pings</em> are
						ephemeral messages that correspond to the element that
						is 'being pinged'. The user doesn't select the contents
						of the message itself, but pings an element which could
						be relevant during a certain moment. The content of the
						pinged message is a prediction which could be based on
						different metrics such as who edited the pinged element
						or if the pinging user made any new changes.
					</p>
					<p>
						The contextual ping is an explicit and very unstable
						action. The effectiveness of the message depends
						entirely on the software's prediction and the user has
						no possibility to intervene or change the message.
						Similar to the previous examples, the explicit ping can
						be turned into an implicit message, ex. by spamming a
						ping to imply importance of something or express
						annoyance.
					</p>
					<p>
						While there might be previous occurences of a similar
						interaction, it was{' '}
						<a
							href='https://www.pcgamer.com/apex-legends-ping-system-is-a-tiny-miracle-for-fps-teamwork-and-communication/'
							target='_blank'
							rel='noopener noreferrer'>
							popularized in 2019 by the first-person shooter Apex
							Legends
						</a>
						, which used contextual pings as means of accessible,
						non-verbal communication between players in a fast-paced
						environment.
					</p>
					<Legend>
						Hover an element on the makeshift canvas and press the{' '}
						<kbd>Middle Mouse</kbd> button.
					</Legend>
					<Legend>
						Alternatively, hold the
						<kbd>Alt</kbd> / <kbd>Option</kbd> key and press the
						<kbd>Left mouse</kbd> button.
					</Legend>
					<ContextualPing
						clients={{ LOCAL_CLIENT: localClient, ...clients }}
						lastContextualPing={lastContextualPing}
						onContextualPing={handleContextualPing}
					/>
				</article>

				<article>
					<Heading index={5} sup={'Implicit ⟶ Explicit'}>
						Cursor gestures
					</Heading>
					<p>
						Cursor gesture embodies the nature of implicit body
						movements. Similar to nodding or shaking the head as act
						of approval or disapproval, moving the cursor lateral or
						vertical makes this implicit message explicit.
					</p>
					<label>
						<input
							type='checkbox'
							onClick={() => setEnableGestures((prev) => !prev)}
							onChange={() => {}}
							checked={enableGestures}
						/>
						Enable cursor gestures
					</label>
					<Legend>
						Enable the feature and gesticulate with your cursor.{' '}
						<br />
						The available gesture are vertical shaking (
						<i>nodding</i>), horizontal shaking (<i>head-shaking</i>
						) and encircling something (
						<i>emphasizing or highlighting something</i>).
					</Legend>
					<Gesture
						enableGestures={enableGestures}
						position={localClient}
						pointerDown={localClient.pointerDown}
						onGesture={handleGesture}
					/>
				</article>
				<Footer />
			</Container>
		</Wrapper>
	)
}

const Wrapper = styled.div`
	position: relative;
	width: 100%;
	min-height: 100vh;
	padding: 4rem;
`

const Container = styled.div`
	max-width: var(--content-max-width);
	margin: 0 auto;

	& label {
		background: var(--color-secondary);
		border-radius: 0.5rem;
		margin: 1rem 0;
		padding: 0.5rem;
		font-size: 0.875rem;
		display: inline-flex;
		align-items: center;

		& input {
			margin-right: 0.5rem;
		}
	}

	& article {
		margin-bottom: 6rem;
	}
`

const Legend = styled.div`
	background: var(--color-secondary);
	border-radius: 0.5rem;
	padding: 1rem;
	margin: 2rem 0 2rem 0;
	font-size: 0.875rem;
	line-height: 1.5;

	& kbd {
		margin: 0 0.125rem;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.625rem;
		border: 0.0625rem solid rgb(200, 200, 200);
		line-height: 1.5;
		display: inline-block;
		box-shadow: 0 0.0625rem 0 rgba(0, 0, 0, 0.2),
			inset 0 0 0 0.125rem #ffffff;
		background-color: rgb(245, 245, 245);
		box-shadow: 0 0.0625rem 0 rgba(0, 0, 0, 0.2), 0 0 0 2px #ffffff inset;
		text-shadow: 0 0.0625rem 0 #fff;
	}

	label + & {
		margin-top: 0;
	}

	& + & {
		margin-top: -1rem;
	}
`

export default App
