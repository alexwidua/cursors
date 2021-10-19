import React from 'react'
import styled from 'styled-components'

const Footer = () => {
	return (
		<Container>
			<p>
				<em>Cursors</em> is a small summer '21 exploration by{' '}
				<a
					href='https://www.alexwidua.com/'
					target='_blank'
					rel='noopener noreferrer'>
					Alex Widua
				</a>{' '}
				🍹🏝️
			</p>
			<p>
				<a
					href='https://github.com/alexwidua/cursors'
					target='_blank'
					rel='noopener noreferrer'>
					View the source code on GitHub
				</a>
			</p>
		</Container>
	)
}

const Container = styled.footer`
	text-align: center;
	padding: 1rem 0;
	opacity: 0.5;
	transition: opacity 0.3s;

	& p {
		margin: 0;
		font-size: 0.75rem !important;
	}

	& a {
		color: #000;
	}

	&:hover {
		opacity: 1;
	}
`

export default Footer
