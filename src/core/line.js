/**
 * Module description: src/core/line.js
 *
 * Line class which represents a drawable line on a Graph that supports drawing lines.
 *
 * Created on 01/10/2018
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import Point from "./point";
import config from "./../config"
import { rgba } from "./../utils/colours";
import { splineCurve } from "./interpolation";
import * as arrays from "./../utils/arrays";
import { isUndefOrNull } from "../utils/object";

/**
 * Line class that represent the drawing mechanicsms of each line that is drawn on a
 * graph.
 *  */
class Line {
  constructor(data, graph, options) {
    this.data = data;
    this.graph = graph;
    this.options = options;

    this._convertDataToPoints();
  }

  /**
   * @since v1.0.0
   *
   * Function to convert the given data points into plottable data on the chart. This has
   * to be done since we need to convert the data into positions on the chart that can be
   * drawn.
   * */
  _convertDataToPoints() {
    this.points = [];

    for (let index = 0; index < this.data.length; index++) {
      this.points.push(
        new Point({ x: index, y: this.data[index] }, this.graph)
      );
    }

    if (this.options.interpolation === "cubic") {
      this._computeInterpolationControlPoints();
    }
  }

  /**
   * @since v1.0.0
   *
   * Internal function to compute interpoliation points for a line if it has 'cubic' intrtpolation
   * enabled.
   * */
  _computeInterpolationControlPoints() {
    this.controlPoints = [];

    // start from point 1 and not point 0, as point one and last point will
    // be quadratic curves and not splines
    for (let k = 1; k < this.points.length - 1; k++) {
      this.controlPoints.push(
        splineCurve(
          arrays.getPrevious(k, this.points),
          this.points[k],
          arrays.getNext(k, this.points),
          config.tension,
          this.graph
        )
      );

      // perform a check to see if a control point goes out of the graph bounds,
      // if so we correct this behaviour by setting the 'y' to the lengths.y_begin
      // value.
      if (this.controlPoints[k - 1].prev.y < this.graph.lengths.y_begin) {
        this.controlPoints[k - 1].prev.y = this.graph.lengths.y_begin;
      }

      if (this.controlPoints[k - 1].next.y < this.graph.lengths.y_begin) {
        this.controlPoints[k - 1].next.y = this.graph.lengths.y_begin;
      }
    }
  }

  /**
   * @since v1.0.0
   *
   * Internal function to draw the line fill for a linearly interpolated line.
   *  */
  _drawLineFill() {
    const context = this.graph.drawer.context;

    context.beginPath();

    for (let i = 0; i < this.points.length - 1; i++) {
      // Initiate critical points on X-Axis
      const x1 = new Point(
        { x: i, y: this.graph.axisManager.yAxis.start },
        this.graph
      );
      const x2 = new Point(
        { x: i + 1, y: this.graph.axisManager.yAxis.start },
        this.graph
      );

      context.moveTo(this.points[i].x, this.points[i].y);
      context.lineTo(this.points[i + 1].x, this.points[i + 1].y);
      context.lineTo(x2.x, x2.y);
      context.lineTo(x1.x, x1.y);
    }

    context.closePath();
    context.fill();
  }

  /**
   * @since v1.0.0
   *
   * Internal function to draw the line fill for a cubic interpolated line.
   *  */
  _drawLineFillForCubic() {
    const context = this.graph.drawer.context;

    let f1 = new Point(
      { x: 0, y: this.graph.axisManager.yAxis.start },
      this.graph
    );
    let f2 = new Point(
      { x: 1, y: this.graph.axisManager.yAxis.start },
      this.graph
    );

    context.beginPath();

    // Begin by creating the outline for the first chunk of the cubic curve section
    // since the first section and the last section have to be drawn slightly differently.
    context.moveTo(this.points[0].x, this.points[0].y);
    context.quadraticCurveTo(
      this.controlPoints[0].prev.x,
      this.controlPoints[0].prev.y,
      this.points[1].x,
      this.points[1].y
    );
    context.lineTo(f2.x, f2.y);
    context.lineTo(f1.x, f1.y);

    // iterate over the central critical points and create a fillable path
    for (let i = 1; i < this.points.length - 2; i++) {
      // Initiate critical points on X-Axis
      const x1 = new Point(
        { x: i, y: this.graph.axisManager.yAxis.start },
        this.graph
      );
      const x2 = new Point(
        { x: i + 1, y: this.graph.axisManager.yAxis.start },
        this.graph
      );

      context.moveTo(this.points[i].x, this.points[i].y);
      context.bezierCurveTo(
        this.controlPoints[i - 1].next.x,
        this.controlPoints[i - 1].next.y,
        this.controlPoints[i].prev.x,
        this.controlPoints[i].prev.y,
        this.points[i + 1].x,
        this.points[i + 1].y
      );
      context.lineTo(x2.x, x2.y);
      context.lineTo(x1.x, x1.y);
    }

    let f3 = new Point(
      { x: this.points.length - 2, y: this.graph.axisManager.yAxis.start },
      this.graph
    );
    let f4 = new Point(
      { x: this.points.length - 1, y: this.graph.axisManager.yAxis.start },
      this.graph
    );

    const precursorPoint = this.points[this.points.length - 1];

    // for the last section we have to draw it 'backwards'
    context.moveTo(f4.x, f4.y);
    context.lineTo(precursorPoint.x, precursorPoint.y);
    context.quadraticCurveTo(
      this.controlPoints[this.controlPoints.length - 1].next.x,
      this.controlPoints[this.controlPoints.length - 1].next.y,
      this.points[this.points.length - 2].x,
      this.points[this.points.length - 2].y
    );
    context.lineTo(f3.x, f3.y);
    context.closePath();
    context.fill();
  }

  /**
   * @since v1.0.0
   *
   * Function that can be called by a graph to draw the graph including the line
   * style and the line fill (if enabled).
   *  */
  draw() {
    const context = this.graph.drawer.context;

    if (!isUndefOrNull(this.options.area) && this.options.area.fill) {
      // set the 'global' alpha to 0.6 for lines that are on top of each other to look as if they are 'transparent'
      context.globalAlpha = 0.6;

      // Apply area colour setting if one is present, if not default to using
      // the general colour of the line.
      if (!isUndefOrNull(this.options.area.colour)) {
        context.fillStyle = this.options.area.colour;
      } else {
        context.fillStyle = this.options.colour;
      }

      // draw fill depending on interpolation
      if (this.options.interpolation === "cubic") {
        this._drawLineFillForCubic();
      } else if (this.options.interpolation === "linear") {
        this._drawLineFill();
      }
      context.globalAlpha = 1;
    }

    // setup canvas context for drawing.
    context.lineJoin = "round";
    context.lineWidth = config.lineWidth;
    context.fillStyle = rgba(this.options.colour, 100);
    context.strokeStyle = rgba(this.options.colour, 40);
    context.setLineDash(this.options.style === "dashed" ? [5, 5] : []);

    if (this.options.interpolation === "cubic") {
      // draw the cubic spline curves

      context.beginPath();
      for (let i = 1; i < this.points.length - 2; i++) {
        // begin current trajectory, by moving to starting point
        context.moveTo(this.points[i].x, this.points[i].y);

        // create bezier curve using the next control point of previous entry
        // and previous control point of current entry and which leads to next
        // point
        context.bezierCurveTo(
          this.controlPoints[i - 1].next.x,
          this.controlPoints[i - 1].next.y,
          this.controlPoints[i].prev.x,
          this.controlPoints[i].prev.y,
          this.points[i + 1].x,
          this.points[i + 1].y
        );
      }

      context.stroke();
      context.closePath();

      // now draw the starting quadratic between first and second curve
      context.beginPath();
      context.moveTo(this.points[0].x, this.points[0].y);
      context.quadraticCurveTo(
        this.controlPoints[0].prev.x,
        this.controlPoints[0].prev.y,
        this.points[1].x,
        this.points[1].y
      );
      context.stroke();
      context.closePath();

      // now draw final quadratic curve, between last and the point before the last.
      context.beginPath();
      context.moveTo(
        this.points[this.points.length - 1].x,
        this.points[this.points.length - 1].y
      );

      context.quadraticCurveTo(
        this.controlPoints[this.controlPoints.length - 1].next.x,
        this.controlPoints[this.controlPoints.length - 1].next.y,
        this.points[this.points.length - 2].x,
        this.points[this.points.length - 2].y
      );
      context.stroke();
      context.closePath();
    } else {
      context.beginPath();
      for (let p = 0; p < this.points.length - 1; p++) {
        context.moveTo(this.points[p].x, this.points[p].y);
        context.lineTo(this.points[p + 1].x, this.points[p + 1].y);
      }

      context.stroke();
      context.closePath();
    }

    // if point annotation is enabled, draw the points.
    if (this.options.annotatePoints) {
      this.points.forEach((point, index) => {
        if (
          index == this.points.length - 1 ||
          (point.data.x / this.graph.axisManager.xAxis.scaleStep) % 1 === 0) 
        {
          point.draw();
        }
      });
    }
  }
}

export default Line;
