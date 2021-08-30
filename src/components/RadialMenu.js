import React, { useState, useEffect, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'

const PING_VANISH_MS = 1500 //ms
const NUM_MENU_ITEMS = 3 // radial menu items
const MENU_ROTATION = 30 //deg
const MENU_LONG_PRESS_TRESHOLD = 120 //ms

// Apply 'random' rotation to ping elements
const DEGREE_MAP = [
	1, -18, 11, -4, -18, -12, -14, 12, 13, -10, 15, 18, -13, 13, 1, -10, 11, 1,
	1, -1, -4, 3, 20, 3, 14, 1, 4, -18, 10, -14, 16, 11, -7, -13, -18, -5, -4,
	-18, 6, -10, 12, 10, -17, -14, -5, 4, 17, 8, 1, -16, 12, -10, -19, 10, 15,
	10, 20, -9, 9, 7, -4, 15, -18, 19
]

const INDEX_MAP = {
	0: '', // X icon
	1: '🔥',
	2: '👎',
	3: '👍'
}

const RadialMenu = ({
	clients,
	localClient,
	lastReceivedPingMessage,
	onPingEvent,
	onMenuOpen
}) => {
	return (
		<>
			<PingMessage
				clients={clients}
				lastReceivedPingMessage={lastReceivedPingMessage}
			/>
			<Menu
				localClient={localClient}
				onPingEvent={onPingEvent}
				onMenuOpen={onMenuOpen}
				onPing={onPingEvent}
			/>
		</>
	)
}

/**
 * Radial menu
 */
const Menu = ({ localClient, onPing, onMenuOpen }) => {
	const { pointer } = localClient

	const [isVisible, setIsVisible] = useState(true)
	const [menuItemIndex, setMenuItemIndex] = useState(-1)
	const [hoveredMenuItemIndex, setHoveredMenuItemIndex] = useState(0)
	const [freezeMenuInCurrentPosition, setFreezeMenuInCurrentPosition] =
		useState({ x: 0, y: 0 })

	// Display menu after long mouse press
	useEffect(() => {
		let timer
		setFreezeMenuInCurrentPosition({
			x: localClient.x,
			y: localClient.y
		})

		// Only open menu if middle MB click, or Ctrl+LMB for computers without middle click
		if (
			(pointer.down && pointer.type === 1) ||
			(pointer.down && pointer.type === 0 && pointer.ctrl)
		) {
			timer = setTimeout(handleLongPress, MENU_LONG_PRESS_TRESHOLD)
		} else {
			timer = null
			clearTimeout(timer)
			handleMouseUp()
		}
		return () => {
			clearTimeout(timer)
		}
	}, [pointer])

	const handleLongPress = () => {
		setIsVisible(true)
		onMenuOpen(true)
	}

	const handleMouseUp = () => {
		if (menuItemIndex > 0 && pointer.type === 1) {
			emitPingEvent()
		} else {
			setMenuItemIndex(0)
		}
		onMenuOpen(false)
		setIsVisible(false)
	}

	const emitPingEvent = () => {
		onPing({
			index: menuItemIndex,
			x: localClient.x,
			y: localClient.y
		})
	}

	return (
		<MenuContainer
			isVisible={isVisible}
			x={freezeMenuInCurrentPosition.x}
			y={freezeMenuInCurrentPosition.y}
			onMouseLeave={() => setMenuItemIndex(-1)}>
			{NUM_MENU_ITEMS > 2 &&
				[...Array(NUM_MENU_ITEMS)].map((el, i) => {
					const key = i + 1
					return (
						<Element
							key={key}
							index={key}
							onMouseUp={() => setMenuItemIndex(key)}
							onMouseEnter={() => setHoveredMenuItemIndex(key)}>
							<span>{INDEX_MAP[key]}</span>
						</Element>
					)
				})}
			<CenterIcon
				onMouseEnter={() => {
					setMenuItemIndex(0)
					setHoveredMenuItemIndex(0)
				}}>
				{INDEX_MAP[hoveredMenuItemIndex]}
			</CenterIcon>
		</MenuContainer>
	)
}

/**
 * Ping message that gets drawn onto the canvas/site
 */
const PingMessage = ({ clients, lastReceivedPingMessage }) => {
	const [receivedPings, setReceivedPings] = useState([])

	useEffect(() => {
		const ping = {
			id: lastReceivedPingMessage.id,
			x: clients[lastReceivedPingMessage.id]?.x || 0,
			y: clients[lastReceivedPingMessage.id]?.y || 0,
			index: lastReceivedPingMessage.index,
			rotation: lastReceivedPingMessage.rotation
		}
		setReceivedPings((prev) => [...prev, ping])
		let timer = setTimeout(() => setReceivedPings(''), PING_VANISH_MS)

		return () => {
			clearTimeout(timer)
		}
	}, [lastReceivedPingMessage])

	return (
		<>
			{receivedPings.length > 0 &&
				receivedPings.map((el, i) => (
					<MessageContainer
						key={i}
						rotation={el?.rotation || 0}
						style={{
							left: el?.x + 'px',
							top: el?.y + 'px',
							//transform: `rotate(${el?.rotation}deg)`,
							background: clients[el.id]?.color || '#eee'
						}}>
						{INDEX_MAP[el.index]}
					</MessageContainer>
				))}
		</>
	)
}

/**
 * Menu styles
 */
const MenuContainer = styled.div.attrs((props) => ({
	style: {
		top: `${props.y - 128}px`,
		left: `${props.x - 128}px`,
		visibility: props.isVisible ? 'visible' : 'hidden',
		pointerEvents: props.isVisible ? 'all' : 'none'
	}
}))`
	--hover-color: rgb(250, 250, 250);
	--stroke-width: 1px;

	position: absolute;
	z-index: 10;
	width: 256px;
	height: 256px;
	overflow: hidden;
	font-size: 1.5rem;
	border: var(--stroke-width) solid #eee;
	border-radius: 50%;
	box-shadow: rgba(149, 157, 165, 0.1) 0px 8px 24px;
	transform: rotate(${MENU_ROTATION}deg);
`
const Element = styled.div`
	position: absolute;
	top: 50%;
	left: 50%;
	width: 10rem;
	height: 10rem;
	margin-top: -10rem;
	margin-left: -10rem;
	background: #fff;
	box-shadow: 0 0 0 var(--stroke-width) #eee;
	transform: rotate(${(props) => (360 / NUM_MENU_ITEMS) * props.index}deg)
		skew(${90 - 360 / NUM_MENU_ITEMS}deg);
	transform-origin: 100% 100%;

	&:hover {
		background-color: var(--hover-color);
	}

	& span {
		position: absolute;
		top: 64px;
		left: 64px;
		display: block;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		margin-left: -11px;
		transform: skew(${90 - (360 / NUM_MENU_ITEMS) * -1}deg)
			rotate(
				${(props) =>
					360 -
					(360 / NUM_MENU_ITEMS) * props.index -
					MENU_ROTATION}deg
			);
	}
`

const CenterIcon = styled.div`
	position: absolute;
	top: 50%;
	left: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 96px;
	height: 96px;
	background: #fff;
	border-radius: 100%;
	box-shadow: 0 0 0 var(--stroke-width) #eee;
	transform: translateX(-50%) translateY(-50%) rotate(-${MENU_ROTATION}deg);

	&:hover {
		background-color: var(--hover-color);
	}

	&:empty {
		background-image: url("data:image/svg+xml,%3Csvg width='18' height='18' viewBox='0 0 18 18' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M0.292893 16.2929C-0.0976311 16.6834 -0.097631 17.3166 0.292893 17.7071C0.683418 18.0976 1.31658 18.0976 1.70711 17.7071L9 10.4142L16.2929 17.7071C16.6834 18.0976 17.3166 18.0976 17.7071 17.7071C18.0976 17.3166 18.0976 16.6834 17.7071 16.2929L10.4142 9L17.7071 1.70711C18.0976 1.31658 18.0976 0.683417 17.7071 0.292893C17.3166 -0.097631 16.6834 -0.0976309 16.2929 0.292893L9 7.58579L1.70711 0.292894C1.31658 -0.0976299 0.683418 -0.0976299 0.292893 0.292894C-0.0976311 0.683419 -0.0976311 1.31658 0.292893 1.70711L7.58579 9L0.292893 16.2929Z' fill='gray'/%3E%3C/svg%3E%0A");
		background-repeat: no-repeat;
		background-position: center center;
	}
`

/**
 * Ping message styles
 */

const flyIn = (rotation) => keyframes`
 0% { transform: scale(2) rotate(${rotation}deg); opacity: 0; }
 100% { transform: scale(1) rotate(${rotation}deg); opacity: 1;  }
`

const MessageContainer = styled.div`
	position: absolute;
	width: 2rem;
	height: 2rem;
	font-size: 1.5rem;
	line-height: 2rem;
	text-align: center;
	border-radius: 100%;
	animation-name: ${(props) => flyIn(props.rotation)};
	animation-duration: 0.2s;
	animation-fill-mode: forwards;
`

export default RadialMenu
