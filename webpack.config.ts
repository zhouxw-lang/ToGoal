import * as webpack from 'webpack';
import * as path from 'path';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';

const config: webpack.Configuration = {
    target: 'web',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    entry: {
        popup: './src/scripts/popup.tsx',
        options: './src/scripts/options.tsx',
    },
    context: path.join(__dirname),
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.scss$/,
                use: ['style-loader', 'css-loader', 'sass-loader'],
            },
        ],
    },

    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.json', '.css'],
    },
    devtool: 'cheap-module-source-map',
    plugins: [
        new CleanWebpackPlugin(),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/manifest.json', to: 'manifest.json' },
                { from: 'src/icons', to: 'icons' },
            ],
        }),
        new HtmlWebpackPlugin({
            template: path.join('src', 'popup.html'),
            filename: 'popup.html',
            chunks: ['popup'],
        }),
        new HtmlWebpackPlugin({
            template: path.join('src', 'options.html'),
            filename: 'options.html',
            chunks: ['options'],
        }),
    ],
};

export default config;
