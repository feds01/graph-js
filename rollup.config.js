/**
 * Module description: rollup.config.js
 *
 * Created on 07/01/19
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

const commonjs = require("rollup-plugin-commonjs");
const resolve = require("rollup-plugin-node-resolve");
const terser = require("rollup-plugin-terser").terser;
// const compiler = require('@ampproject/rollup-plugin-closure-compiler');

const pkg = require("./package.json");

const input = "src/graph.js";
const banner = `/*!
 * graph.js v${pkg.version} 
 * ${pkg.homepage}
 * (c) ${new Date().getFullYear()} Wasabi & Co.
 */`;

module.exports = [
    // UMD builds (including moment)
    // dist/graph.min.js
    // dist/graph.js
    {
        input: input,
        plugins: [
            resolve(),
            commonjs()
        ],
        output: {
            name: "Graph",
            file: "dist/graph.js",
            banner: banner,
            format: "umd",
            indent: false
        }
    },
    {
        input: input,
        plugins: [
            resolve(),
            commonjs(),
            terser({
                output: {
                    preamble: banner
                },
                compress: {
                    warnings: true
                },
                sourcemap: true,
                keep_classnames: false,
                keep_fnames: false,
            })
            // compiler(),
        ],
        output: {
            name: "Graph",
            file: "dist/graph.min.js",
            format: "umd",
            indent: false
        }
    }
];