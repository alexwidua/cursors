/**
 * @file The cursor component displays the remote cursors, local and remote
 * cursor chat bubbles and cursor gestures.
 */

import React, { useRef, useEffect, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { LOCAL_CLIENT_PRIMARY_COLOR } from '../constants'

export const CURSOR_HEIGHT = 24
export const NAME_BADGE_HEIGHT = 18

// Cursor chat
const CURSOR_CHAT_HOTKEY = 'c'
const CURSOR_CHAT_VANISH_INTERVAL = 3000 // ms

const GESTURE_VANISH_INTERVAL = 2000

// Map gesture value to more meaningful string
const GESTURE_MAP = {
	horizontal: 'No',
	vertical: 'Yes!',
	circle: 'Look here'
}

const CursorComponent = ({
	id = null,
	isLocal = false,
	clientName,
	position,
	cursorIsInViewport,
	color = '#000',
	clientWindowIsFocused = true,
	lastEmittedMessage = '',
	lastEmittedGesture,
	onEmitMessage
}) => {
	return (
		<Cursor
			cursorX={position.x}
			cursorY={position.y}
			cursorIsInViewport={cursorIsInViewport}
			cursorColor={color}
			clientWindowIsFocused={clientWindowIsFocused}
			isLocal={isLocal}>
			{/* Show cursor chat */}
			<CursorChat
				id={id}
				isLocal={isLocal}
				cursorIsInViewport={cursorIsInViewport}
				color={color}
				lastEmittedMessage={lastEmittedMessage}
				onEmitMessage={onEmitMessage}>
				{clientName}
			</CursorChat>
			{/* Display gesture tokens */}
			<GestureMessage
				lastEmittedGesture={lastEmittedGesture}
				textColor={color}
			/>
		</Cursor>
	)
}

const CursorChat = ({
	id,
	isLocal,
	cursorIsInViewport,
	color,
	lastEmittedMessage,
	onEmitMessage,
	children
}) => {
	const [chatBubbleIsVisible, setChatBubbleIsVisible] = useState(false)

	// local message input
	const inputRef = useRef(null)
	const [localChatInput, setLocalChatInput] = useState('')

	// message display
	const [outboundChatMessage, setOutboundChatMessage] = useState('')
	const [inboundChatMessage, setInboundChatMessage] = useState('')

	/**
	 * Side effects
	 */
	// Register chat hotkey listeners
	useEffect(() => {
		if (!id) {
			function handleKey(e) {
				if (e.key === CURSOR_CHAT_HOTKEY) {
					setChatBubbleIsVisible(true)
					inputRef.current.focus()
				}
			}
			window.addEventListener('keyup', handleKey)
			return () => {
				window.removeEventListener('keyup', handleKey)
			}
		}
	}, [])

	// Handle inbound messages
	useEffect(() => {
		handleInboundChatMessage(lastEmittedMessage)
	}, [lastEmittedMessage])

	// Vanish inbound and outbound messags after X ms
	useEffect(() => {
		const timer = setTimeout(
			() => setInboundChatMessage(''),
			CURSOR_CHAT_VANISH_INTERVAL
		)
		return () => clearTimeout(timer)
	}, [inboundChatMessage])

	useEffect(() => {
		const timer = setTimeout(
			() => setOutboundChatMessage(''),
			CURSOR_CHAT_VANISH_INTERVAL
		)
		return () => clearTimeout(timer)
	}, [outboundChatMessage])

	/**
	 * Event handlers
	 */
	// Handle local chat events
	const handleLocalChatInputChange = (e) => {
		setLocalChatInput(e.target.value)
		setOutboundChatMessage('') // remove previous sent message if new message is being typed, this is purely UX
	}
	const handleLocalChatKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			emitMessage(localChatInput)
		} else if (e.key === 'Escape') {
			closeChat()
		}
	}

	const emitMessage = (outboundChatMessage) => {
		onEmitMessage(outboundChatMessage)
		setOutboundChatMessage(outboundChatMessage)
		setLocalChatInput('')
	}

	const handleInboundChatMessage = (lastEmittedMessage) => {
		setInboundChatMessage(lastEmittedMessage)
	}

	const closeChat = () => {
		setChatBubbleIsVisible(false)
		setOutboundChatMessage('')
		setLocalChatInput('')
	}

	return (
		<>
			<ChatBubble
				isVisible={id || chatBubbleIsVisible}
				isLocal={isLocal}
				cursorIsInViewport={cursorIsInViewport}
				color={isLocal ? '#eee' : color}>
				{/* Display name badge only for remote cursors */}
				{id && (
					<NameBadge minimizeName={inboundChatMessage}>
						{children}
					</NameBadge>
				)}

				{/* Out and inbound messages */}
				{outboundChatMessage && (
					<ChatMessage outbound>{outboundChatMessage}</ChatMessage>
				)}
				{inboundChatMessage && (
					<ChatMessage>{inboundChatMessage}</ChatMessage>
				)}

				{/* Local chat input */}
				{!id && chatBubbleIsVisible && (
					<input
						type="text"
						ref={inputRef}
						value={localChatInput}
						placeholder={
							outboundChatMessage ? '' : 'Say something...'
						}
						onChange={handleLocalChatInputChange}
						onKeyDown={handleLocalChatKeyDown}
						onBlur={closeChat}
					/>
				)}
			</ChatBubble>
		</>
	)
}

/**
 * Gesture messages, which visually bubble up from the cursor.
 */
const GestureMessage = ({ lastEmittedGesture, textColor }) => {
	const [showGesture, setShowGesture] = useState([])

	// Handle and vanish gestures after X ms
	useEffect(() => {
		setShowGesture((prev) => [...prev, lastEmittedGesture])
		const timer = setTimeout(
			() => setShowGesture([]),
			GESTURE_VANISH_INTERVAL
		)
		return () => clearTimeout(timer)
	}, [lastEmittedGesture])

	return (
		<>
			{/* Display gesture tokens */}
			{showGesture.map((el, i) => (
				<GestureToken
					key={i}
					style={{
						left: el.offsetX,
						color: textColor
					}}>
					{GESTURE_MAP[el.gesture]}
				</GestureToken>
			))}
		</>
	)
}

const Cursor = styled.div.attrs((props) => ({
	style: {
		transform: `translate3d(${props.cursorX}px, ${props.cursorY}px, 0)`,
		opacity: props.clientWindowIsFocused ? '1' : '0.2',
		width: `${props.cursorIsInViewport ? 24 : '0'}px`,
		height: `${props.cursorIsInViewport ? 24 : '0'}px`,
		// Smoothing the local chat bubble makes it feel sluggish
		transition: props.isLocal ? 'none' : 'transform 0.05s'
	}
}))`
	position: absolute;
	top: 0;
	left: 0;
	z-index: 9999;
	color: ${(props) => (props.isLocal ? LOCAL_CLIENT_PRIMARY_COLOR : '#fff')};
	background-image: ${(props) =>
		props.isLocal
			? 'none'
			: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 16 22' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0V22L5.85366 16.3036L6.04878 16.1071H16L0 0Z' fill='black'/%3E%3C/svg%3E%0A\")"};
	background-repeat: no-repeat;
	user-select: none;
	pointer-events: none;

	/* Prevent name from wrapping around */
	& div {
		white-space: nowrap;
	}
`

const NameBadge = styled.div.attrs((props) => ({
	style: {
		fontSize: props.minimizeName ? 12 : 14,
		opacity: props.minimizeName ? 0.6 : 1
	}
}))`
	height: ${NAME_BADGE_HEIGHT}px;
	line-height: ${NAME_BADGE_HEIGHT}px;
	transition: font-size 0.2s, opacity 0.2s; ;
`

const ChatBubble = styled.div.attrs((props) => ({
	style: {
		top: `${props.cursorIsInViewport ? 24 : props.isLocal ? 20 : 0}px`,
		left: `${props.cursorIsInViewport ? 12 : props.isLocal ? 12 : 0}px`,
		backgroundColor: props.color,
		borderRadius: props.cursorIsInViewport
			? props.isLocal
				? '12px 12px 2px 12px'
				: '2px 12px 12px 12px'
			: NAME_BADGE_HEIGHT
	}
}))`
	position: absolute;
	display: inline-block;
	padding: 8px 12px;
	opacity: ${(props) => (props.isVisible ? '1' : '0')};
	transition: opacity 0.2s, border-radius 0.2s;

	& input {
		padding: 6px;
		font-size: 12px;
		background: none;

		&:focus {
			border: none;
			outline: none;
		}
	}
`

const ChatMessage = styled.div`
	padding: ${(props) => (props.outbound ? '8px 6px' : '8px 0px 4px 0px')};
	font-size: 12px;
	opacity: ${(props) => (props.outbound ? '0.5' : '1')};
`

const evaporate = keyframes`
	0% {
		transform: translateY(0px); opacity: 1;
	}
	100% {
		transform: translateY(-256px); opacity: 0;
	}
`
const GestureToken = styled.span`
	position: absolute;
	top: 0;
	left: 0;
	color: ${LOCAL_CLIENT_PRIMARY_COLOR};
	font-weight: 600;
	font-size: 24px;
	white-space: nowrap;
	animation-name: ${evaporate};
	animation-duration: ${GESTURE_VANISH_INTERVAL}ms;
	animation-fill-mode: forwards;
`

export default CursorComponent
