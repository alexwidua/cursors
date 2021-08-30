const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const Dotenv = require('dotenv-webpack')

module.exports = () => {
	return {
		plugins: [
			new HtmlWebpackPlugin({
				template: path.resolve(__dirname, 'src/index.html')
			}),
			new Dotenv()
		],
		module: {
			rules: [
				{
					test: /\.(js|jsx)$/,
					exclude: /node_modules/,
					use: ['babel-loader']
				},
				{
					test: /\.css$/i,
					use: ['style-loader', 'css-loader']
				}
			]
		}
	}
}
