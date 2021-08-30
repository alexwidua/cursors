const getRandomNumberInRange = (range) => {
	return (
		Math.ceil(Math.random() * range) * (Math.round(Math.random()) ? 1 : -1)
	)
}

export { getRandomNumberInRange }
