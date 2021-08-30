import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

/**
 * The gesture detection works by rendering invisible divs which
 * follow the mouse cursor with a small delay (with a hacky transition-delay: .01s)
 * Each div has a mouseEnter event which then is stored -- the sequence of the events
 * determine the gesture. More explanation in the handleEnter func.
 * This feels super cheesy, works for this prototype though.
 *
 * While this seems like a dirty approach, it's sufficient and works in the scope of
 * this prototype. There might be more elaborate approaches with Hough transforms,
 * although I believe that detecting circle gestures might be tricky...
 *
 */

const TRIGGER_ELEMENT_SIZE = 600 //px
const EMIT_TRESHOLD = 75 //ms

const Gesture = ({ position, pointerDown, onGesture, debug = false }) => {
	const [history, setHistory] = useState([])
	const [prevTreshold, setPrevTreshold] = useState(0)
	const [lastEmit, setLastEmit] = useState(0)

	/**
	 * Handles mouseEnter event which 'detects' gestures based on succession of each element
	 */
	const handleEnter = (index) => (e) => {
		if (pointerDown) return

		// Assign each trigger element (index) a different values
		//    [1]
		// [4]   [2]
		//    [3]
		// The previous 4 values are tracked and multiplied respectively
		// A clockwise-rotation would then result in 1*2*3*4 = 24 -> detect circle
		// Horizontal scrubbing: 2*4*2*4 = 64 etc.

		const valueMap = [1, 2, 4, 3]
		const tresholdMap = { circle: 24, vertical: 9, horizontal: 64 }
		const now = Date.now()

		// Store history of previous X values
		const historyLimit = 4 // make sure that x % 4 = 0
		const temp =
			history.length <= historyLimit - 1 ? history : history.slice(1)
		temp.push({ time: now, value: valueMap[index] })
		setHistory(temp)

		if (history.length == historyLimit) {
			// Only detect gesture if events happened between X ms
			const timeTreshold = 800
			const isRecent = now - history[0].time < timeTreshold

			// Multiply history values to determine gesture
			const treshold = history.reduce((a, b) => ({
				value: a.value * b.value
			}))

			if (isRecent && prevTreshold.value === treshold.value) {
				const gesture = Object.keys(tresholdMap).find(
					(key) => tresholdMap[key] === treshold.value
				)

				if (gesture && now - lastEmit > EMIT_TRESHOLD)
					onGesture(gesture)
				setLastEmit(now)
			}
			setPrevTreshold(treshold)
		}
	}

	return (
		<Container y={position.y} x={position.x}>
			{/* {gestureMessage && (
				<GestureMessage>{gestureMessage}</GestureMessage>
			)} */}
			<Trigger showDebugLine={debug}>
				{[...Array(4)].map((el, i) => (
					<TriggerElement
						key={i}
						onMouseEnter={handleEnter(i)}
						showDebugLine={debug}
					/>
				))}
			</Trigger>
		</Container>
	)
}

const Container = styled.div.attrs((props) => ({
	style: {
		transform: `translate3d(${props.x - TRIGGER_ELEMENT_SIZE / 2}px, ${
			props.y - TRIGGER_ELEMENT_SIZE / 2
		}px, 0)`
	}
}))`
	position: absolute;
	top: 0;
	left: 0;
	z-index: 0;
	width: ${TRIGGER_ELEMENT_SIZE}px;
	height: ${TRIGGER_ELEMENT_SIZE}px;
	/* Hacky transition-delay to allow for gesture detection */
	transition-delay: 0.01s;
	user-select: none;
`

const Trigger = styled.div`
	display: grid;
	grid-gap: 48px;
	grid-template-columns: 1fr 1fr;
	width: 100%;
	height: 100%;
	border: ${(props) => (props.showDebugLine ? '1px solid red' : 'none')};
	transform: rotate(45deg);
`

const TriggerElement = styled.div`
	width: 100%;
	height: 100%;
	border: ${(props) => (props.showDebugLine ? '1px solid blue' : 'none')};
`

const GestureMessage = styled.div`
	position: absolute;
	top: 50%;
	left: 50%;
	font-size: 20px;
	transform: translateX(-50%) translateY(-50%);
`

export default Gesture
