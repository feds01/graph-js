/**
 * Module description:   src/legends/legend.js.js
 *
 * Created on 04/01/2019
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import config from "../config";
import { assert } from "../utils/assert";
import * as arrays from "../utils/arrays";
import colours from "../utils/colours";


class LegendManager {
  constructor(graph, data) {
    assert(data !== null, "Legend data must not be null");

    this.graph = graph;

    /* data is just an array of simple objects containing two fields, a legend label and a colour */
    this.data = data;

    /* Position of the legend container on the graph object */
    this.position = this.graph.options.legend.position ?? LegendManager.Pos.TOP;

    // check that the position is valid
    if (!Object.values(LegendManager.Pos).includes(this.position)) {
      this.position = LegendManager.Pos.TOP;
    }

    this.alignment = this.graph.options.legend.alignment ?? LegendManager.Alignment.CENTER;

    // check that the alignment is valid
    if (!Object.values(LegendManager.Alignment).includes(this.alignment)) {
      this.alignment = LegendManager.Alignment.CENTER;
    }

    // determine the relevant size that the padding needs to increase by based on the position 
    // of the legend. If the orientation of the legend is vertical, only the 'max width' matters,
    // and if the orientation is horizontal, only the height of the legend matters.
    if (
      this.position == LegendManager.Pos.LEFT ||
      this.position == LegendManager.Pos.RIGHT
    ) {
      // get longest label
      const longestItem = arrays.longest(this.data.map((item) => item.label));

      this.requiredSpace = this.getRequiredSpaceFor(longestItem);
    } else {
      this.requiredSpace = this.graph.fontSize();
    }
  }

  static PADDING = 4;

  static Pos = {
    LEFT: "left",
    RIGHT: "right",
    TOP: "top",
    BOTTOM: "bottom",
  };

  static Alignment = {
    START: "start",
    CENTER: "center",
    END: "end",
  };

  getRequiredSpaceFor(item) {
    // add add 2px padding on top and bottom
    let size = this.graph.fontSize() + LegendManager.PADDING;

    size += this.graph.ctx.measureText(item).width + LegendManager.PADDING;
    
    return size;
  }

  /**
   * Function to draw a label with a key box denoting one of the graph legends
   * 
   * @param {string} label - The name of the line that represents this legend
   * @param {string} colour - The colour of the key box
   * @param {solid|dashed} style - Border style of the key box
   * @param {number} x - x coordinate of where to draw the label
   * @param {number} y - y coordinate of where to draw the label
   *  */
  drawLegend(label, colour, style, x, y) {

    this.graph.ctx.lineWidth = 1;
    this.graph.ctx.strokeStyle = colour;
    this.graph.ctx.fillStyle = colour;

    // set the line dash
    this.graph.ctx.setLineDash(style === "dashed" ? [4, 4] : []);
    this.graph.ctx.strokeRect(x, y, this.graph.labelFontSize, this.graph.labelFontSize);

    // reduce the alpha to distinct fill between stroke
    this.graph.ctx.globalAlpha = 0.6;

    this.graph.ctx.fillRect(x, y, this.graph.labelFontSize, this.graph.labelFontSize);

    // move by the fontSize + 8 as the padding
    // TODO: convert magic 12 label size to a constant
    this.graph.drawer.text(label, x + this.graph.labelFontSize + 8, y + this.graph.labelFontSize / 2, 12, config.axisColour, "left");

  }


  /**
   * Function that draws this component.
   */
  draw() {
    let orientation = "",
      xBegin = this.graph.lengths.x_begin,
      yBegin = LegendManager.PADDING;

    switch (this.position) {
      case LegendManager.Pos.TOP:
        orientation = "horizontal";

        break;
      case LegendManager.Pos.BOTTOM: {
        orientation = "horizontal";
        yBegin = this.graph.canvas.height - this.requiredSpace;

        break;
      }
      case LegendManager.Pos.LEFT:
        orientation = "vertical";

        xBegin = LegendManager.PADDING;
        yBegin = this.graph.lengths.y_begin;

        break;
      case LegendManager.Pos.RIGHT: {
        orientation = "vertical";
        xBegin = this.graph.lengths.x_end + LegendManager.PADDING * 2;
        yBegin = this.graph.lengths.y_begin;

        break;
      }
      default: {
        // if this happens, then something wrong happened and we should avoid
        // drawing the axis and just set a warning.
        assert(false, "Invalid legend position");

        return;
      }
    }

    // pre-compute all the required space per legend
    const requiredSpaces = this.data.map((item, index) => {
      const initial = LegendManager.PADDING * 2;
      
      if (orientation == "horizontal") {
        // add padding between each item if it's not the end item
        const additional = index != this.data.length - 1 ? initial * 2 : 0;

        return initial + this.getRequiredSpaceFor(item.label) + additional;
      } else {
        // add padding between each item if it's not the end item
        const additional = index != this.data.length - 1 ? initial : initial / 2;

        return additional + this.graph.fontSize();
      }
    });

    // adjust begin values in correspondence to alignment
    if (orientation == "horizontal") {
      switch (this.alignment) {
        case LegendManager.Alignment.START:
          break; // we don't need to do anything here since we assume that it is the initial condition
        case LegendManager.Alignment.CENTER: {
          const offset = arrays.sum(requiredSpaces) / 2;

          xBegin = this.graph.lengths.x_center - offset + LegendManager.PADDING; // we add one padding unit to account for the space between each legend
          break;
        }
        case LegendManager.Alignment.END: {
          const offset = arrays.sum(requiredSpaces);

          xBegin = this.graph.lengths.x_end - offset;
          break;
        }
      }
    } else {
       switch (this.alignment) {
        case LegendManager.Alignment.START:
          break; // we don't need to do anything here since we assume that it is the initial condition
        case LegendManager.Alignment.CENTER: {
          const offset = arrays.sum(requiredSpaces.slice(0, Math.round(requiredSpaces.length / 2)));

          yBegin = this.graph.lengths.y_center - offset;
          break;
        }
        case LegendManager.Alignment.END: {
          const offset = arrays.sum(requiredSpaces);

          yBegin = this.graph.lengths.y_begin + this.graph.yLength - offset;
          break;
        }
      }
    }

    // if we need to draw debug boundary, then do so
    if (this.graph.options.debug) {
      const lineWidth = this.graph.ctx.lineWidth;
      const strokeStyle = this.graph.ctx.strokeStyle;

      this.graph.ctx.lineWidth = 2;
      this.graph.ctx.strokeStyle = colours.PURPLE;

      const xLength = orientation === "horizontal" ? arrays.sum(requiredSpaces) : this.requiredSpace;
      const yLength = orientation === "vertical"   ? arrays.sum(requiredSpaces) : this.requiredSpace;

      this.graph.ctx.strokeRect(xBegin, yBegin, xLength, yLength);
      
      // reset stroke width and stroke colour
      this.graph.ctx.lineWidth = lineWidth; 
      this.graph.ctx.strokeStyle = strokeStyle;
    }


    // draw legend for each provided line from the basics
    for (let idx = 0; idx < this.data.length; idx++) {
      const item = this.data[idx];

      this.drawLegend(item.label, item.colour, item.style, xBegin, yBegin);

      // compute new offsets
      if (orientation == "horizontal") {
        xBegin += requiredSpaces[idx]
  
      } else {
        // we have to use vertical spacing rather than horizontal spacing.
        yBegin += requiredSpaces[idx];
      }

    }
  }
}

export default LegendManager;
