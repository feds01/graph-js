/**
 * Module description:   src/helpers/assert.js.js
 *
 * Created on 01/01/2019
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

const config = require("./../config");

module.exports = {
    assert: function (condition, message) {
        if (!condition) {            
            const assertMessage = `Assertion failed: ${message}`;

            if (config.bypassOutOfBoundsDrawing) { // warn instead of throwing an error
                console.warn(assertMessage);
            } else {
                throw new Error(assertMessage);
            }
        }
    }
};

