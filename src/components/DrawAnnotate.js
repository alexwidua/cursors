/**
 * @file Canvas component on which local and remote cursors can draw.
 * It checks the clients object for clients with a true pointerDown property,
 * which allows multiple remote cursors to draw at the same time.
 */

import React, { useRef, useState, useEffect } from 'react'
import styled from 'styled-components'

const CANVAS_HEIGHT = 248
const CANVAS_BRUSH_SIZE = 4 //px

const DrawAndAnnotateComponent = ({ clients }) => {
	const wrapperRef = useRef(null)
	const canvasRef = useRef(null)
	const [canvasContext, setCanvasContext] = useState(null)
	const [prevClients, setPrevClients] = useState({})

	useEffect(() => {
		if (!canvasRef.current) return
		setCanvasContext(canvasRef.current.getContext('2d'))
		canvasRef.current.height = wrapperRef.current.clientHeight
		canvasRef.current.width = wrapperRef.current.clientWidth
	}, [])

	useEffect(() => {
		Object.keys(clients).forEach((id) => {
			if (typeof clients[id] === 'undefined') return

			const brushColor =
				id === 'LOCAL_CLIENT' ? '#000' : clients[id].color
			if (clients[id].pointer.down && clients[id].pointer.type === 0) {
				drawOnCanvas(
					{
						fromX: prevClients[id].x,
						fromY: prevClients[id].y - window.pageYOffset,
						toX: clients[id].x,
						toY: clients[id].y - window.pageYOffset
					},
					brushColor
				)
			}
		})

		setPrevClients(clients)
	}, [clients])

	const drawOnCanvas = (position, brushColor) => {
		const rect = wrapperRef.current.getBoundingClientRect()

		canvasContext.beginPath()
		canvasContext.lineJoin = 'round'
		canvasContext.lineCap = 'round'
		canvasContext.lineWidth = CANVAS_BRUSH_SIZE
		canvasContext.moveTo(
			position.fromX - rect.left,
			position.fromY - rect.top
		)
		canvasContext.lineTo(position.toX - rect.left, position.toY - rect.top)
		canvasContext.strokeStyle = brushColor
		canvasContext.stroke()
	}

	return (
		<Container ref={wrapperRef}>
			<CanvasCtx ref={canvasRef} />
		</Container>
	)
}

const Container = styled.div`
	width: var(--content-max-width);
	height: ${CANVAS_HEIGHT}px;
`

const CanvasCtx = styled.canvas`
	width: 100%;
	height: 100%;
	/* Dotted background */
	background-image: url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='3' cy='3' r='3' fill='%23C4C4C4'/%3E%3C/svg%3E%0A");
	border: var(--content-border);
	border-radius: var(--content-border-radius);
	/* Subtle inner glow */
	box-shadow: inset 0px 0px 2rem 2rem rgba(255, 255, 255, 0.75);
`

export default DrawAndAnnotateComponent
