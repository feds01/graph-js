import config from "./config";
import { merge } from "./utils/object";
import colours, { rgba } from "./utils/colours";
import { assert } from "./utils/assert";
import * as arrays from "./utils/arrays";
import * as utils from "./utils/html";

import Line from "./core/line";
import Drawer from "./core/drawing";
import AxisManager from "./core/axis-manager";
import DataManager from "./core/data-manager";
import LegendManager from "./legend/manager";

/**
 * @since v0.0.1 Default values for options within the object, however this will
 * soon be phased out in favour of core/config * */
const defaultConfig = {

  // internal settings
  debug: false,
  
  // general graph settings
  x_label: "",
  y_label: "",
  labelFont: `"Roboto Mono", monospace`,
  labelFontSize: 12,

  padding: 8,

  title: {
    draw: true,
    content: "Graph",
    position: "center",
    fontFamily: "monospace",
    fontSize: 24,
    colour: config.axisColour,
  },

  // default grid settings
  grid: {
    gridded: true,
    gridLineStyle: "solid",
    optimiseSquareSize: true,
    sharedAxisZero: true,
    strict: false,
  },

  // default scale settings
  scale: {
    shorthandNumerics: false,
    x: {
      ticks: 10,
      optimiseTicks: true,
      drawTicks: true,
      drawLabels: true,
      labelDirection: "horizontal",
      axisColour: config.axisColour,
      tickLabels: null,
    },
    y: {
      ticks: 10,
      drawTicks: true,
      drawLabels: true,
      startAtZero: false,
      axisColour: config.axisColour
    },
  },

  // default legend settings
  legend: {
    draw: false,
    position: "top",
    alignment: "center"
  }

}; // TODO: create a validation schema function

/**
 * Class that represent the basis graph drawing option
 */
class BasicGraph {
   /**
     * @since v0.0.1 The id of the html container that the graph should
     * be drawn within * */
    id;

    /**
     * @since v0.0.1 Graph options, this contain x-labels, y-label, tittle, legends, points
     * style, gridded, etc. More on graph options can be read in the documentation * */
    options;

    /**
     * @since v0.0.1 DataManager object which contains the data for the lines the graph should
     * plot, the object also contains various utility functions to fetch stats on the data. * */
    dataManager;

     /*
     * @since v0.0.1 AxisManager object is a manager class for the Axis objects of this Graph object,
     * The AxisManager contains the xAxis & yAxis objects, it also handles the synchronisation of scales &
     * negative axis modes.
     * */
    axisManager;

 
  constructor(id, options, data) {
    this.id = id;
    this.dataManager = new DataManager(data);

    // This is the global 'options' object for the whole settings range including grid, scale and
    // general settings.
    this.options = merge(defaultConfig, options);


    // find canvas element and tittle element.
    const canvas = utils.findCanvas(this.id);

    this.canvas = canvas;
    this.ctx = utils.setupCanvas(canvas);

    this.drawer = new Drawer(this.canvas, this.ctx, {labelFont: this.options.labelFont});

    this.axisManager = new AxisManager(this);


     // initial padding configuration
     this.padding = {
      top: this.options.padding,
      left: null,
      right: this.options.padding,
      bottom: null,

      textPadding: 4,
    };

    // check if we need to draw the legend for this graph.
    if (this.options.legend.draw) {
      this.legendManager = new LegendManager(this, this.dataManager.generateLegendInfo());
    } else {
      this.legendManager = null;
    }

    // now that we have determined if we are using legends, compute the padding
    this.calculatePadding();

    this.xLength =
      this.canvas.width -
      (this.padding.right + this.padding.left + this.options.labelFontSize);
    this.yLength =
      this.canvas.height - (this.padding.top + this.padding.bottom);

    // Subtract a 1 from each length because we actually don't need to worry about the first
    // iteration. Having an extra pole will make the square size less than it should be, We're
    // actually only really concerned about how many 'gaps' there are between each item
    this.gridRectSize = {
      x: this.xLength / (this.axisManager.xAxis.scaleLabels.length - 1),
      y: this.yLength / (this.axisManager.yAxis.scaleLabels.length - 1),
    };

    // if 'strict' grid mode is enabled, we select the smallest grid size out of x and y
    // and set this to being the grid size lengths
    if (this.options.grid.strict) {
      let gridRectLength = Math.min(this.gridRectSize.x, this.gridRectSize.y);

      this.gridRectSize.x = gridRectLength;
      this.gridRectSize.y = gridRectLength;
    }

    // Calculate all the necessary length the graph requires to draw itself.
    this.calculateLengths();
  }

  fontSize() {
    return parseInt(this.ctx.font.substr(0, 2), 10);
  }

  /**
   * @since v0.0.1
   * @API This method is used to remove a line by a given 'label' which is present with every line that
   * is present on the graph. If the developer does not specify a label, a random string is generated and that
   * is used as a label instead.
   * */
  // TODO: most likely not random string, just use incremental labeling like 'line_2', 'line_3' etc.
  removeLineByLabel(label) {
    let foundLine = false;

    for (let k = 0; k < this.dataManager.data.length; k++) {
      if (this.dataManager.data[k].label === label && !foundLine) {
        this.dataManager.data.splice(k, 1);
        foundLine = true;
      }
    }

    // re-draw the graph regardless if a line was found found or not
    this.draw();

    assert(foundLine, "No line named '" + label + "' found on this graph.");
  }

  /**
   * @since v0.0.1
   * @API This method is used to fetch all line labels that are present on this graph.
   *
   * */
  getLineLabels() {
    return this.dataManager.data.map((lineData) => {
      return lineData.label;
    });
  }

  determinePositionFromSetting(setting) {
    if (setting === "start") {
      return {offset: this.lengths.x_begin, alignement: "left"};
    } else if (setting === "center") {
      return {offset: this.lengths.x_center, alignment: "center"};
    } else if (setting === "end") {
      return {offset: this.lengths.x_end, alignment: "right"};
    } else {
      assert(false, "Positional setting did not match any of the presets");
    }
  }

  _drawLabels() {


    if (this.options.title.draw) {
      // draw the graph title at the specified position with font size and family specified
      const {offset, alignment} = this.determinePositionFromSetting(this.options.title.position);

      this.ctx.save();

      // add the title
      this.drawer.text(
        this.options.title.content,
        offset,
        (this.options.title.fontSize + this.padding.textPadding) / 2, // so the text is vertically centered
        this.options.title.fontSize,
        this.options.title.colour,
        alignment
      );

      this.ctx.restore();
    }

    if (this.options.labelFontSize === 0) return;
    
      let labelXOffset = 0;
      let labelYOffset = 0;

      // check if we need to offset the x-label
      if (this.options.legend.draw && this.legendManager.position == LegendManager.Pos.BOTTOM) {
        labelXOffset = this.legendManager.requiredSpace;
      }

      // check if we need to offset the y-label
      if (this.options.legend.draw && this.legendManager.position == LegendManager.Pos.LEFT) {
        labelYOffset = this.legendManager.requiredSpace;
      }

      // add x-axis label
      this.drawer.text(
        this.options.x_label,
        this.lengths.x_center,
        this.drawer.height - ((this.fontSize() / 2) + this.padding.textPadding + labelXOffset),
        this.fontSize(),
        config.axisColour
      );

      // add y-axis label
      this.ctx.save();
      this.ctx.translate(this.fontSize() + labelYOffset, this.lengths.y_center);
      this.ctx.rotate(-Math.PI / 2);
      this.ctx.fillText(this.options.y_label, 0, 0);

      this.ctx.restore();
  }

  _drawAxisGrid() {
    this.ctx.lineWidth = config.gridLineWidth;
    this.ctx.strokeStyle = rgba(config.axisColour, 40);

    this.ctx.setLineDash(this.options.grid.gridLineStyle === "dashed" ? [5, 5] : []);
    
    // get the number of ticks on the axis
    const xTicks = this.axisManager.xAxisTickCount;
    const yTicks = this.axisManager.yAxisTickCount;

    // TODO: are we drawing the ticks?
    const y_len = this.options.grid.gridded ? 9 + this.yLength : 9;
    const x_len = this.options.grid.gridded ? 9 + this.xLength : 9;

    let offset = 0;

    while (offset <= Math.max(yTicks - 1, xTicks)) {
      // The X-Axis drawing
      if (offset < xTicks) {
        let x_offset = offset * this.gridRectSize.x;

        this.drawer.verticalLine(
          this.lengths.x_begin + x_offset,
          this.yLength + this.padding.top,
          -y_len + 9
        );
      }

      // The Y-Axis drawing
      if (offset < this.axisManager.yAxis.scaleLabels.length) {
        let y_offset = offset * this.gridRectSize.y;

        this.drawer.horizontalLine(
          this.lengths.x_begin,
          this.lengths.y_begin + y_offset,
          x_len - 9
        );
        
      }
      offset++;
    }
  }

  _drawData() {
    for (let lineData of this.dataManager.get()) {
     
      // don't even init the line if no data is supplied
      if (
        lineData.data.constructor === Float64Array &&
        lineData.data.length > 0
      ) {
        let line = new Line(lineData.data, this, lineData);

        line.draw();
      }
    }
  }

  calculateLengths() {
    this.xLength =
      this.canvas.width -
      (this.padding.right + this.padding.left + this.options.labelFontSize);
    
    this.yLength =
      this.canvas.height -
      (this.padding.top + this.padding.bottom + this.options.labelFontSize);

    this.lengths = {
      x_begin: this.padding.left + this.options.labelFontSize,
      y_begin: this.padding.top,
      x_end: this.drawer.width - this.padding.right,
      y_end: this.drawer.height - this.padding.bottom,
      x_center: this.padding.left + this.options.labelFontSize + this.xLength / 2,
      y_center: this.padding.top + this.options.labelFontSize / 2 + this.yLength / 2,
    };
  }


  /**
   * Calculates the padding around the graph grid, taking into account font sizes
   * of labels, title, legends and any other parameters that could affect the size
   * that needs to be reserved around the area.
   *  */
  calculatePadding() {

    // get the specified font size for title and the standard text padding so there
    // is a gap between the graph (and maybe a legend)
    this.padding.top += this.options.title.draw ? this.options.title.fontSize + this.padding.textPadding : 0;

    // Set the config font size of axis labels, and then we can effectively 'measure' the width of the text
    const longestItem = arrays.longest(this.axisManager.yAxis.getScaleLabels());

    this.drawer.toTextMode(this.options.labelFontSize, config.axisColour);
    this.padding.left = Math.ceil(
      this.options.padding + 9 + 3*this.padding.textPadding + this.ctx.measureText(longestItem).width
    );    
      
    // if we don't have a legend on the right hand side of the table, we might need to add some padding
    // to the right hand-side of the graph.
    if (!this.options.legend.draw || this.options.legend.position !== LegendManager.Pos.RIGHT) {
      const lastItemOnXAxis = this.axisManager.xAxis.scaleLabels[this.axisManager.xAxis.scaleLabels.length - 1];
      this.padding.right = Math.ceil(this.ctx.measureText(lastItemOnXAxis).width);
    }
  
    // measure the right padding to determine if we need to add padding to
    // fit in the last scale label if it goes out of bounds.
    this.padding.bottom = Math.ceil(
      9 + 2 * this.options.labelFontSize + 3 * this.padding.textPadding
    ); // TODO: convert magic const '9' or the tick length into const

    // apply legened padding if legends are enabled
    if (this.options.legend.draw) {
      this.padding[this.legendManager.position] += this.legendManager.requiredSpace;
    }
  }


  /**
   * Method that draws the whole graph, computing all pre-requisites and then invoking
   * draw on children components.
   *  */
  draw() {
    // clear the rectangle and reset colour
    this.ctx.clearRect(0, 0, this.drawer.width, this.drawer.height);
    this.ctx.strokeStyle = config.axisColour;
    this.ctx.fillStyle = colours.BLACK;
    this.ctx.translate(0.5, 0.5);

    // optimise x-square-size if float
    if (this.options.grid.optimiseSquareSize && this.gridRectSize.x % 1 !== 0) {
      let preferredSquareSize = Math.round(this.gridRectSize.x);
      let numberOfSquares = this.axisManager.xAxis.scaleLabels.length - 1;

      // If the square size was some round up, rather than down, we need to check if
      // we can actually apply the 'scale' up with the padding space available to the right
      // of the graph. If we can't fit in the scale up, we will have to go down as we are
      // guaranteed to have enough space.
      if (preferredSquareSize > this.gridRectSize.x &&
        this.padding.right - (preferredSquareSize - this.gridRectSize.x) * numberOfSquares < 0
      ) {
        preferredSquareSize--;
      }
      this.gridRectSize.x = preferredSquareSize;

      // If 'strict' mode is set in options.grid, we also need to set the value of the 'y' length
      // to be the same as the x length.
      if (this.options.grid.strict) {
        this.gridRectSize.y = preferredSquareSize;
      }

      // we need to re-calculate right padding before we can call calculateLengths() as it is dependant on the
      // right padding value, which has now changed.
      this.padding.right =
        this.canvas.width -
        (this.gridRectSize.x * numberOfSquares + this.lengths.x_begin);

      this.xLength =
        this.canvas.width -
        (this.padding.right + this.padding.left + this.options.labelFontSize);
    }

    this.calculateLengths();

    // TODO: this should be used as a general form for the Y-Axis length of the graph.
    this.yLength = (this.axisManager.yAxis.scaleLabels.length - 1) * this.gridRectSize.y;

    /* Draw our Axis', including negative scales & scale labels */
    this.axisManager.draw();

    /* Draw the 'X-Label' & 'Y-Label' labels on the graph canvas */
    this._drawLabels();

    /* Draw the Grid on the Graph lines & axis ticks, if enabled */
    this._drawAxisGrid();

    /* Draw the legend if it is enabled */
    this.legendManager?.draw();

    /* Draw the data sets on the graph, using the provided dataset configurations  */
    this._drawData();


    // draw boundaries over graph if we're in debug view.
    if (this.options.debug) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset translatation

      this.ctx.lineWidth = 2;

      // draw box around title 
      if (this.options.title.draw) {
        this.ctx.save();
        this.ctx.font = `${this.options.title.fontSize}px ${this.options.title.fontFamily}`
        const titleWidth = this.ctx.measureText(this.options.title.content).width;
        this.ctx.restore();

        this.ctx.strokeStyle = colours.PURPLE;
        this.ctx.strokeRect(this.lengths.x_center -  titleWidth / 2, 1, titleWidth, this.options.title.fontSize);
  
      }
      // draw canvas boundary in red
      this.ctx.strokeStyle = "red";
      this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.strokeStyle = colours.DEBUG;
      this.ctx.fillStyle = colours.DEBUG;

      // draw box around graph boundary
      this.ctx.strokeRect(this.lengths.x_begin, this.lengths.y_begin, this.xLength, this.yLength);

      // draw line at center of the graph
      this.ctx.beginPath();
      this.ctx.moveTo(this.lengths.x_begin, this.lengths.y_center);
      this.ctx.lineTo(this.lengths.x_end, this.lengths.y_center);

      this.ctx.moveTo(this.lengths.x_center, this.lengths.y_begin);
      this.ctx.lineTo(this.lengths.x_center, this.lengths.y_end);

      this.ctx.stroke();
      this.ctx.closePath();
    }
  }
}

export default BasicGraph;
