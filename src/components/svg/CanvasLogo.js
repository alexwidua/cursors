import React from 'react'

export const CanvasLogo = () => {
	return (
		<svg
			width="140"
			height="140"
			viewBox="0 0 140 140"
			fill="none"
			xmlns="http://www.w3.org/2000/svg">
			<rect width="140" height="140" rx="24" fill="#0075FF" />
			<circle cx="59.5" cy="59.5" r="31.5" fill="url(#paint0_linear)" />
			<circle cx="80.5" cy="80.5" r="31.5" fill="url(#paint1_linear)" />
			<defs>
				<linearGradient
					id="paint0_linear"
					x1="59.5"
					y1="28"
					x2="59.5"
					y2="91"
					gradientUnits="userSpaceOnUse">
					<stop stopColor="white" />
					<stop offset="1" stopColor="white" stopOpacity="0" />
				</linearGradient>
				<linearGradient
					id="paint1_linear"
					x1="80.5"
					y1="49"
					x2="80.5"
					y2="112"
					gradientUnits="userSpaceOnUse">
					<stop stopColor="white" />
					<stop offset="1" stopColor="white" stopOpacity="0" />
				</linearGradient>
			</defs>
		</svg>
	)
}
