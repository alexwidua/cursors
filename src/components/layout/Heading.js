import React from 'react'
import styled from 'styled-components'

const Heading = ({ index, sup, children }) => {
	return (
		<Container>
			<Sup>{sup}</Sup>
			<Title index={index}>{children}</Title>
		</Container>
	)
}

const Container = styled.span`
	display: flex;
	flex-direction: column;
	margin-top: 4rem;
`

const Sup = styled.p`
	margin: 0;
	padding-bottom: 0.875em;
	font-size: 0.75rem;
	font-family: monospace;
`

const Title = styled.h2`
	position: relative;
	font-weight: 600;
	font-size: 1.375rem;

	&::before {
		position: absolute;
		top: -0.25rem;
		left: -3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		font-size: 1rem;
		background: var(--color-secondary);
		border-radius: 100%;
		content: '${(props) => props.index}';
	}
`

export default Heading
