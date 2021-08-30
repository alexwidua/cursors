import React, { useRef, useState, useEffect } from 'react'
import styled from 'styled-components'

import { CanvasLogo } from './svg/CanvasLogo'

const LOCAL_MESSAGE_BG_COLOR = 'rgba(0,0,0,0.85)'
const LOCAL_MESSAGE_FONT_COLOR = '#fff'
const MESSAGE_VANISH_MS = 5000

// The example nodes on the fake canvas
const LOGO_HEADING = 'Draft_2 · edited a few hours ago'

const TEXT_HEADING = 'Heading.md · not staged'
const TEXT_BODY = 'From Richmond to San'
const TEXT_MISSPELL = 'Fracnisco'

// Map the message contents of different contexts
const MESSAGE_MAP = {
	NULL: 'There was a problem loading the ping message.',
	LOGO_BODY: 'Look ath the logo',
	LOGO_META: 'Are there any changes?',
	TEXT_DEFAULT: 'Look at this text',
	TEXT_ERROR: 'Look at this error',
	TEXT_META: 'Should we stage this file?'
}

const PingContextual = ({ clients, lastContextualPing, onContextualPing }) => {
	const [selectedtText, setSelectedText] = useState(null)

	const [localMsg, setLocalMsg] = useState({ type: null, content: null })
	const [remoteMsg, setRemoteMsg] = useState({ type: null, content: null })

	/**
	 * Vanish local messages after X ms
	 */
	useEffect(() => {
		let timer = setTimeout(() => setLocalMsg(null), MESSAGE_VANISH_MS)
		return () => {
			clearTimeout(timer)
		}
	}, [localMsg])

	/**
	 * Receive remote messages and vanish after X ms
	 */
	useEffect(() => {
		const message = {
			id: lastContextualPing?.id,
			type: lastContextualPing?.type,
			content: MESSAGE_MAP[lastContextualPing?.type],
			color: clients[lastContextualPing?.id]?.color
		}
		setRemoteMsg(message)
		let timer = setTimeout(() => setRemoteMsg(null), MESSAGE_VANISH_MS)
		return () => {
			clearTimeout(timer)
		}
	}, [lastContextualPing])

	/**
	 * Handle mouse down, which triggers the contextual ping
	 */
	const handleMouseDownText = (e) => {
		if (e.button !== 1 || !selectedtText) return

		e.preventDefault()
		e.stopPropagation()

		let message = {
			type: selectedtText,
			content: MESSAGE_MAP[selectedtText]
		}

		setLocalMsg(message)
		onContextualPing(message.type)
	}

	/**
	 * Displays local and remote message, if set.
	 */
	const getLocalMsg = (type) => {
		return localMsg?.type === type ? localMsg?.content : ''
	}
	const getRemoteMsg = (type) => {
		return remoteMsg?.type === type ? remoteMsg?.content : ''
	}

	/**
	 * Returns props used for showing contextual messages.
	 * The messages are ::before and ::after pseudo elements
	 * that have the respective data-attribute (::before = local, ::after = remote)
	 * as their content
	 */
	const useContextualMessage = (type) => {
		return {
			onMouseEnter: () => setSelectedText(type),
			style: {
				...showBorderOnHover(type),
				...getBackgroundAndBorderColor(type)
			},
			'data-local-message': getLocalMsg(type),
			'data-remote-message': getRemoteMsg(type)
		}
	}

	/**
	 * Style related
	 */

	const showBorderOnHover = (type) =>
		selectedtText === type
			? { boxShadow: 'inset 0px 0px 0px 1px #ccc' }
			: null

	const getBackgroundAndBorderColor = (type) => {
		return {
			'--color':
				localMsg?.type === type
					? LOCAL_MESSAGE_BG_COLOR
					: (remoteMsg?.type === type && remoteMsg?.color) ||
					  'transparent'
		}
	}

	return (
		<Container>
			<LogoWrapper
				onMouseDown={handleMouseDownText}
				onMouseLeave={() => setSelectedText(null)}>
				<LogoMeta {...useContextualMessage('LOGO_META')}>
					{LOGO_HEADING}
				</LogoMeta>
				<Svg {...useContextualMessage('LOGO_BODY')}>
					<CanvasLogo />
				</Svg>
			</LogoWrapper>
			<TextNodeWrapper
				onMouseDown={handleMouseDownText}
				onMouseLeave={() => setSelectedText(null)}>
				<LogoMeta {...useContextualMessage('TEXT_META')}>
					{TEXT_HEADING }
				</LogoMeta>
				<TextNode {...useContextualMessage('TEXT_DEFAULT')}>
					<span onMouseEnter={() => setSelectedText('TEXT_DEFAULT')}>
						{TEXT_BODY}
					</span>{' '}
					<SpellingError {...useContextualMessage('TEXT_ERROR')}>
						<SquigglyLines>{TEXT_MISSPELL}</SquigglyLines>
					</SpellingError>
					.
				</TextNode>
			</TextNodeWrapper>
		</Container>
	)
}

const MESSAGE_STYLE = `
        position: absolute;
        left: 50%;
        padding: 4px 8px;
        color: ${LOCAL_MESSAGE_FONT_COLOR};
        font-size: 0.75rem;
        white-space: nowrap;
        background: var(--color);
        transform: translateX(-50%);
        font-weight: 400;
		line-height: 1.5;
        letter-spacing: 0;
		font-family: var(--sans-font);
		z-index: 1000;
    `
const MESSAGE_LOCAL = `
        ${MESSAGE_STYLE}
        border-top-left-radius: 0.5rem;
        border-top-right-radius: 0.5rem;
        border-bottom-left-radius: 0.5rem;
        border-bottom-right-radius: 0.1rem;
        bottom: -2rem;
		content: attr(data-local-message);
    `
const MESSAGE_REMOTE = `
        ${MESSAGE_STYLE}
        border-top-left-radius: 0.1rem;
        border-top-right-radius: 0.5rem;
        border-bottom-left-radius: 0.5rem;
        border-bottom-right-radius: 0.5rem;
        top: -2rem;
		content: attr(data-remote-message);
    `

const SHOW_MESSAGE = `
&::before {
	${MESSAGE_REMOTE}
}
&[data-remote-message='']::before {
	visibility: hidden;
}
&::after {
	${MESSAGE_LOCAL}
}
&[data-local-message='']::after {
	visibility: hidden;
}`

const BORDER_STYLE = `
	box-shadow: inset 0px 0px 0px 2px var(--color);
	border-radius: 6px;
`

const Container = styled.div`
	position: relative;
	z-index: 100;
	width: 100%;
	height: 400px;
	overflow: hidden;
	background: #fff;
	border: 1px solid #eee;
	border-radius: 0.5rem;

	&::before {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		padding: 0.5rem 1rem;
		color: #ccc;
		font-size: 0.75rem;
		border-radius: 2rem;
		content: 'Some whiteboard canvas';
	}
`

const LogoWrapper = styled.div`
	position: absolute;
	top: 64px;
	left: 64px;

	/* border: 1px solid #000; */
`

const Svg = styled.div`
	height: 100%;
	${BORDER_STYLE}

	& svg {
		padding: 16px;
	}
	${SHOW_MESSAGE}
`

const LogoMeta = styled.span`
	position: absolute;
	top: -1em;
	left: 0;
	display: block;
	font-size: 0.75rem;
	font-family: monospace;
	white-space: nowrap;

	${BORDER_STYLE}
	${SHOW_MESSAGE}
`

const TextNodeWrapper = styled.div`
	position: absolute;
	right: 48px;
	bottom: 48px;
`
const TextNode = styled.p`
	width: fit-content;
	margin: 0;
	padding: 6px;
	font-weight: 600;
	font-size: 1.5rem;
	letter-spacing: -0.03em;

	${BORDER_STYLE}
	${SHOW_MESSAGE}
`

const SpellingError = styled.span`
	position: relative;
	height: 100%;
	border-radius: 3px;

	${BORDER_STYLE}
	${SHOW_MESSAGE}
`

const SquigglyLines = styled.span`
	&::after {
		position: absolute;
		bottom: -2px;
		left: 0;
		display: block;
		width: 100%;
		height: 5px;
		background-image: url("data:image/svg+xml,%3Csvg width='6' height='5' viewBox='0 0 6 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1.20718 1.87887L1.37875 1.70729C2.55033 0.535721 4.44982 0.535719 5.6214 1.70729L5.79297 1.87886C5.85629 1.94219 5.92599 1.99524 6 2.03803L6.0001 4.13003C5.40638 4.0302 4.83691 3.75123 4.37875 3.29308L4.20718 3.12151C3.81666 2.73098 3.18349 2.73098 2.79297 3.12151L2.6214 3.29308C1.90795 4.00653 0.92456 4.28551 0 4.13003V2.03803C0.382441 2.25912 0.879979 2.20607 1.20718 1.87887Z' fill='%23FF0000'/%3E%3C/svg%3E%0A");
		background-repeat: repeat-x;
		content: '';
	}
`

export default PingContextual
