/**
 * Module description:   src/core/axis-manager.js
 *
 * Created on 23/12/2018
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 *
 * */
import config from "./../config"
import * as arrays from "../utils/arrays"
import Axis, {AxisType} from "./axis"

class AxisManager {
    constructor(graph) {
        this.graph = graph;

        this.data = graph.dataManager.join();

        // Does the data contain any negative values, if so enable negative axis.
        this.negativeScale = this.data.some((item) => item < 0);

        // initialise the y-axis & x-axis
        this.yAxis = new Axis(this, AxisType.Y_AXIS, this.graph.options.scale.y);
        this.xAxis = new Axis(this, AxisType.X_AXIS, this.graph.options.scale.x);

        // The scale numbers of the x-axis & y-axis in object
        this.scaleNumbers = {
            x: this.xAxis.scaleLabels,
            y: this.yAxis.scaleLabels
        };

        /* Work out if we should do a 'zeroScale', where the 'X' & 'Y' axis' share a zero */
        // if the graph has a zero scale setting, and the y-scale first element is a 0
        // (excluding negative scales), don't draw the 0 on the first tick and remove it from
        // scaleNumbers for the time being.
        if (this.graph.options.grid.sharedAxisZero &&
            this.scaleNumbers.x.indexOf("0") === 0 &&
            this.scaleNumbers.y.indexOf("0") === 0) {
            this.sharedAxisZero = true;
        }
    }

    get xAxisTickCount() {
        return this.xAxis.scaleLabels.length;
    }

    get yAxisTickCount() {
        return this.yAxis.scaleLabels.length;
    }

    /**
     * Method to draw on axis on the current graph. Takes into account graph settings
     * and then invokes the draw method on the individual drawing methods for each axis.
     *  */
    draw() {
        // check if the sharedAxisZero was detected in y-axis draw method, do the same thing
        // as for the y-axis and then draw the centered 0.
        if (this.sharedAxisZero) {
            this.graph.drawer.text("0",
                this.graph.lengths.x_begin - this.graph.options.padding,
                this.graph.yLength + this.graph.padding.top + this.graph.fontSize(),
                12, config.axisColour
            );
        }

        // // get the context ready to draw
        // this.graph.ctx.strokeStyle = rgba(this.options.axisColour, 60);
        // this.graph.ctx.lineWidth = config.gridLineWidth;

        this.yAxis.draw();
        this.xAxis.draw();
    }
}

export default AxisManager;