/**
 * Module description: src/core/axis.js
 *
 * This module holds the general object for a graph/chart axis scale.
 * It determine if the axis should be negative, and also includes methods
 * to draw the scale, provided the graph object.
 *
 * Created on 29/06/2018
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import Scale from "./scale";
import config from "./../config";
import { rgba } from "./../utils/colours";
import * as arrays from "../utils/arrays";
import { assert } from "./../utils/assert";
import conversions from "../utils/conversions";

export const AxisType = {
  X_AXIS: "x-axis",
  Y_AXIS: "y-axis",
};

class Axis {
  constructor(manager, type, options) {
    this.manager = manager;
    this.data = this.manager.data;
    this.graph = this.manager.graph;
    this.options = options;
    this.type = type;

    // This is the variable which holds the tick step of the axis.
    this.scaleStep = 0;

    // we have negative values in the data set and therefore will require two
    // different scales
    this.positveScale = null;
    this.negativeScale = null;

    // Ensure that minTicks & maxTicks don't overflow and aren't negative, otherwise they would cause a
    // DivisionByZero or Infinity issues
    assert(this.options.ticks > 0, `${this.type} cannot have zero or negative tick count`);

    this._computeAxisScale();
    this.scaleLabels = this.generateScaleNumbers();
  }

  /**
   * @since v0.0.1 Takes in input as the lengths object from a graph object.
   * */
  determineAxisPosition() {
    // Y & X positions which represent the start of the drawing line
    // @Cleanup: this must be determined here because the graph 'lengths' haven't been
    // calculated yet.
    this.yStart = this.graph.padding.top + this.graph.yLength;

    // position the x-axis then in the center of the y-axis, calculate this offset by indexing
    // where the zero '0' value in the scale label array (reversed), and multiplying this by the
    // amount of squares there are between the zero and the last axis value. We need to reverse
    // the labels because the Axis position is calculated from the top of the graph, where as
    // the numbers are drawn from the bottom of the graph.

    // TODO: maybe just change the calculation to compute the position of the x-axis from the
    //      bottom of the graph.
    if (this.type === AxisType.X_AXIS && this.manager.negativeScale) {
      let zeroIndex = this.manager.scaleNumbers.y.reverse().indexOf("0");

      // The zero index must not be '-1' or in other words, not found.
      assert(
        zeroIndex !== -1,
        `couldn't find the '0' scale position on the {${this.type}}`
      );

      this.yStart =
        this.graph.lengths.y_begin + this.graph.gridRectSize.y * zeroIndex;
    }
  }

  _computeAxisScale() {
    if (this.type === AxisType.X_AXIS) {

      // we want to set the minimum scale step to 1 since we don't care about numerics on this
      // axis scale.
      this.positveScale = new Scale({
        min: 0,
        max: this.graph.dataManager.maxLen() - 1,

        // Subtract one here since we are counting the axis as a tick as well
        tickCount: this.options.ticks - 1,

        // bound the minimum step to one!
        minimumScaleStep: 1,
      
        optimiseTicks: this.options.optimiseTicks,
      });

      this.scaleStep = this.positveScale.getScaleStep();

    } else if (this.type === AxisType.Y_AXIS) {
      let positiveValues = arrays.positiveAndZeroValues(this.data);

      if (this.manager.negativeScale) {
        let negativeDataSet = arrays
          .negativeValues(this.data)
          .map((x) => Math.abs(x));
        // divide the max ticks by two since negative and positive are sharing the scale.
        
        this.negativeScale = new Scale({
          min: 0,
          max: arrays.getMax(negativeDataSet),
          tickCount: this.options.ticks / 2,
          isNegativeScale: true,
        });
      }

      this.positveScale = new Scale({
        ...arrays.getMinMax(positiveValues),
        tickCount: this.manager.negativeScale
          ? this.options.ticks / 2
          : this.options.ticks,
      });

      // set the axis min and max
      this.min = 0;
      this.max = this.positveScale.range;

      /*
      // Get the largest tick step of the two and set the other scale tick step to the same one. This is
      // because the tick steps must be consistent for both negative and positive scales. Synchronise the
      // tickSteps basically.
      */
      if (this.manager.negativeScale) {
        this.scaleStep = Math.max(
          this.positveScale.getScaleStep(),
          this.negativeScale.getScaleStep()
        );

        this.positveScale.setTickStep(this.scaleStep);
        this.negativeScale.setTickStep(this.scaleStep);
        this.start = 0;

        // we'll need to overwrite the 'min' tick for this axis since in positive it will be 0
        this.min = -this.negativeScale.range;
      } else {
        this.scaleStep = this.positveScale.getScaleStep();
        this.start = this.positveScale.roundedMinimum;
      }
    } else {
      throw Error(`Graphika: Unrecognised Axis type '${this.type}'`);
    }
  }

  generateScaleNumbers() {
    let scaleLabels = [];

    if (this.type === AxisType.X_AXIS) {


      // if the user has provided custom labels to use instead of the auto
      // generated ones, we use those instead. In the event that the user 
      // provides less labels than the number of ticks, we will just fill
      // it in by copying in the provided labels.
      if (Array.isArray(this.options.tickLabels) && this.options.drawLabels) {
        assert(this.options.tickLabels.length > 0);

        scaleLabels = this.positveScale.getScaleLabels().map((_, index) => {
            return this.options.tickLabels[index % this.options.tickLabels.length];
        });
      } else {
        scaleLabels = arrays
          .fillRange(this.positveScale.getTickCount() + 1)
          .map((x) => (this.positveScale.scaleStep * x).toString());
      }
    } else {
      if (this.manager.negativeScale) {
        scaleLabels = this.negativeScale.getScaleLabels(true, true);

        // check if 0 & -0 exist, if so remove the negative 0
        if (
          scaleLabels[scaleLabels.length - 1] === "0" &&
          this.positveScale.getScaleLabels().includes("0")
        ) {
          scaleLabels.pop();
        }

        scaleLabels = [
          ...scaleLabels,
          ...this.positveScale.getScaleLabels(),
        ];
      } else {
        scaleLabels = this.positveScale.getScaleLabels();
      }
    }

    return scaleLabels;
  }

  getScaleLabels() {
    let scaleNumericsToDraw = this.generateScaleNumbers();

    if (this.graph.options.scale.shorthandNumerics) {
      scaleNumericsToDraw = scaleNumericsToDraw.map((numeric) => {
        // TODO: unhandled case where we have a float that is larger than log(n) > 1
        if (Number.isInteger(parseFloat(numeric))) {
          return conversions.convertFromNumerical(numeric);
        } else {
          return numeric;
        }
      });
    }

    return scaleNumericsToDraw;
  }

  draw() {
    // determine the positions of the x-axis
    this.determineAxisPosition();
    let offset = this.manager.sharedAxisZero ? 1 : 0;

    // get the context ready to draw
    this.graph.ctx.lineWidth = config.gridLineWidth;
    this.graph.ctx.strokeStyle = rgba(this.options.axisColour, 60);

    // Apply numerical conversion magic.
    let scaleNumericsToDraw = this.getScaleLabels();

    // Y-Axis Drawing !
    if (this.type === AxisType.Y_AXIS) {
      this.graph.drawer.verticalLine(
        this.graph.lengths.x_begin,
        this.graph.lengths.y_begin,
        this.graph.yLength + 9
      );
      this.graph.ctx.textBaseline = "middle";

      for (let number of scaleNumericsToDraw) {
        if (!(this.manager.sharedAxisZero && number.toString() === "0")) {
          let y_offset = offset * this.graph.gridRectSize.y;

          // tick drawing
          this.graph.drawer.horizontalLine(
            this.graph.lengths.x_begin - 9,
            this.graph.lengths.y_begin + y_offset,
            9
          );

          // draw the text
          this.graph.drawer.text(
            number,
            this.graph.lengths.x_begin - 9 - this.graph.padding.textPadding,
            this.graph.padding.top + this.graph.yLength - y_offset,
            config.scaleLabelFontSize,
            this.options.axisColour,
            "right"
          );
          offset++;
        }
      }
    } else {
      this.graph.drawer.horizontalLine(
        this.graph.lengths.x_begin - 9,
        this.yStart,
        this.graph.xLength + 9
      );

      // We also need to draw a horizontal line at the bottom of the graph
      // if it includes a negative quadrant. We can check this by accessing the
      // manager.negativeScale constant, if so draw the horizontal line at the
      // bottom of the graph.
      if (this.manager.negativeScale && !this.graph.options.grid.gridded) {
        this.graph.drawer.horizontalLine(
          this.graph.lengths.x_begin,
          this.graph.yLength + this.graph.padding.top,
          this.graph.xLength
        );
      }

      const scale_offset = this.graph.padding.textPadding + (this.graph.fontSize() / 2);

      for (let number of scaleNumericsToDraw) {
        // if sharedAxisZero isn't enabled and the number isn't zero, draw the number label
        if (!(this.manager.sharedAxisZero && number.toString() === "0")) {
          let x_offset = offset * this.graph.gridRectSize.x;

          // draw the tick
          this.graph.drawer.verticalLine(
            this.graph.lengths.x_begin + x_offset,
            this.graph.yLength + this.graph.padding.top,
            9
          );

          this.graph.drawer.text(
            number,
            this.graph.lengths.x_begin + x_offset,
            this.graph.yLength + 9 + this.graph.padding.top + scale_offset,
            config.scaleLabelFontSize,
            this.options.axisColour,
            "center"
          );
          offset++;
        }
      }
    }
  }
}

export default Axis;
