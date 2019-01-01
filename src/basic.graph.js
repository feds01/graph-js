const utils = require("./utils");
const arrays = require("./utils/arrays");
const draw = require("./core/drawing");
const config = require("./core/config");
const interpolation = require("./core/interpolation");

const {DataManager} = require("./core/dataManager");
const {Point} = require("./core/point");
const colours = require("./utils/colours");
const {AxisManager} = require("./core/axis-manager");

/**
 * @property x_label -> The label which is present on the x-axis of the graph
 * @property y_label -> The label which is present on the y-axis of the graph
 * @property tittle  -> The tittle of the graph, if 'null' is passed, no tittle is displayed.
 *
 * @property tittle_pos -> The position of where the tittle text is shown, options include:
 *           top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
 *
 *
 * @property gridded -> if true, the graph will be drawn with lines at the intervals on the graph.
 * */
class BasicGraph {
    constructor(HtmlElementId, options, data) {
        /**
         * @since v0.0.1 The id of the html container that the graph should
         * be drawn within * */
        this.HtmlElementId = HtmlElementId;

        /**
         * @since v0.0.1 Graph options, this contain x-labels, y-label, tittle, legends, points
         * style, gridded, etc. More on graph options can be read in the documentation * */
        this.options = options;

        /**
         * @since v0.0.1 DataManager() object which contains the data for the lines the graph should
         * plot, the object also contains various utility functions to fetch stats on the data. * */
        this.dataManager = new DataManager(data);

        /**
         * @since v0.0.1 Default values for options within the object, however this will
         * soon be phased out in favour of core/config * */
        this.defaultConfig = {
            x_label: "",
            y_label: "",
            title: "Graph",
            title_pos: "top-center",
            gridded: false,
            padding: 14,
            zero_scale: true,
        };

        /**
         *  @since v0.0.1 This is the font size of the labels, initially it is set to 0, later on it is set if
         * the labels are not null
         * */
        this.labelFontSize = 0;

        // Sanitise the configuration
        if (!utils.isUndefOrNull(this.options)) {
            Object.keys(this.options).forEach((option) => {
                if (this.defaultConfig.hasOwnProperty(option)) {
                    this.defaultConfig[option] = this.options[option];
                }
            });
        }

        this.options = this.defaultConfig;
        this.elementMap = utils.findObjectElements(this.HtmlElementId, this.options);

        // find canvas element and tittle element.
        try {
            this.canvas = this.elementMap.canvas;
            this.ctx = this.canvas.getContext("2d");
            draw.toTextMode(this.ctx, 16, this.options.axis_colour);

            this.c_width = this.canvas.width;
            this.c_height = this.canvas.height;

        } catch (e) {
            if (utils.isUndefOrNull(this.canvas)) {
                throw Error("Provided canvas ID/Element does not exist!\n" + e);
            }
        }

        // if no labels provided, they are disabled as in no room is provided
        // for them to be drawn.
        if (this.options.y_label !== "" && this.options.x_label !== "") {
            this.labelFontSize = this.fontSize();
        }

        /**
         * @since v0.0.1 AxisManager object is a manager class for the Axis objects of this Graph object,
         * The AxisManager contains the xAxis & yAxis objects, it also handles the synchronisation of scales &
         * negative axis modes.
         * */
        this.axisManager = new AxisManager(this);

        this.padding = {
            top: this.options.padding,
            left: null,
            right: this.options.padding,
            bottom: null,
            val: this.options.padding
        };

        this.calculatePadding();

        this.max_xTicks = Math.min(this.dataManager.maxLen(), config.xTicks);
        this.x_length = this.c_width - (this.padding.right + this.padding.left + this.labelFontSize);
        this.y_length = this.c_height - (this.padding.top + this.padding.bottom + this.labelFontSize);


        this.squareSize = {
            x: this.x_length / (this.axisManager.xAxisScaleNumbers.length - 1),
            y: this.y_length / this.axisManager.yAxisScaleNumbers.length
        };


        this.lengths = {
            x_begin: this.padding.left + this.labelFontSize,
            y_begin: this.padding.top,
            x_end: this.c_width - this.padding.right,
            y_end: this.c_height - this.padding.bottom,
            x_center: this.padding.left + this.labelFontSize + this.x_length / 2,
            y_center: this.labelFontSize + this.y_length / 2,
        };
    }

    setData(_data) {
        // re-create the data object & call re-draw
        this.dataManager = new DataManager(_data);
        this.redraw();
    }

    fontSize() {
        return parseInt(this.ctx.font.substr(0, 2), 10);
    }

    removeLineByLabel(label) {
        for (let k = 0; k < this.dataManager.data.length - 1; k++) {
            if (this.dataManager.data[k].label === label) {
                this.dataManager.data.splice(k, 1);
            }
        }
        this.redraw(); // re-draw the graph
    }

    _drawLabels() {
        if (this.labelFontSize !== 0) {
            // add x-axis label
            draw.toTextMode(this.ctx, this.fontSize(), config.axis_colour);
            this.ctx.fillText(this.options.x_label, this.lengths.x_center, this.c_height - (this.fontSize() / 2));

            // add y-axis label
            this.ctx.save();
            this.ctx.translate(parseInt(this.fontSize(), 10), this.lengths.y_center);
            this.ctx.rotate(-Math.PI / 2);
            this.ctx.fillText(this.options.y_label, 0, 0);
            this.ctx.restore();
        }
    }

    _drawAxis() {
        this.ctx.lineWidth = 1;
        let offset = 0;

        while (offset <= Math.max(this.axisManager.yAxisScaleNumbers.length, this.dataManager.maxLen() + 1)) {
            this.ctx.strokeStyle = utils.rgba(config.axis_colour, 40);

            // grid drawing
            let y_len = this.options.gridded ? 9 + this.axisManager.yAxisScaleNumbers.length * this.squareSize.y : 9,
                x_len = this.options.gridded ? 9 + this.axisManager.xAxisScaleNumbers.length * this.squareSize.x : 9;


            // The X-Axis drawing
            if (offset <= this.max_xTicks /*+ 1*/) {
                let x_offset = offset * this.squareSize.x;

                draw.verticalLine(this.ctx,
                    this.lengths.x_begin + x_offset,
                    this.lengths.y_end + 9,
                    -y_len
                );
            }
            // The Y-Axis drawing
            if (offset <= this.axisManager.yAxisScaleNumbers.length) {
                let y_offset = offset * this.squareSize.y;

                draw.horizontalLine(this.ctx,
                    this.lengths.x_begin - 9,
                    this.lengths.y_end - y_offset,
                    x_len
                );
            }
            offset++;
        }
    }

    _drawData() {
        let lineWidth = config.lineWidth;

        // convert the data into {x, y} format
        this.dataManager.toPos();

        for (let line of this.dataManager.get()) {
            // alter the line width if there are more data points than maximum ticks on graph.
            // reduce it to one pixel.
            if (this.dataManager.maxLen() > config.xTicks) {
                lineWidth = 2;
            }

            // setup for drawing
            this.ctx.lineJoin = "round";
            this.ctx.strokeStyle = utils.rgba(line.colour, 40);
            this.ctx.fillStyle = utils.rgba(line.colour, 40);
            this.ctx.setLineDash(line["style"] === "dashed" ? [5, 5] : []);
            this.ctx.lineWidth = lineWidth;

            let points = [];

            for (let idx = 0; idx < line.pos_data.length; idx++) {
                points.push(new Point(line.pos_data[idx], this));
            }

            if (line["interpolation"] === "cubic") {
                let controlPoints = [];

                // start from point 1 and not point 0, as point one and last point will
                // be quadratic curves and not splines
                for (let k = 1; k < points.length - 1; k++) {
                    controlPoints.push(interpolation.splineCurve(
                        arrays.getPrevious(k, points),
                        points[k], arrays.getNext(k, points),
                        config.tension, this
                    ));
                }

                // draw the cubic spline curves
                for (let i = 1; i < points.length - 2; i++) {
                    // begin current trajectory, by moving to starting point
                    this.ctx.beginPath();
                    this.ctx.moveTo(points[i].x, points[i].y);

                    // create bezier curve using the next control point of previous entry
                    // and previous control point of current entry and which leads to next
                    // point
                    this.ctx.bezierCurveTo(
                        controlPoints[i - 1].next.x, controlPoints[i - 1].next.y,
                        controlPoints[i].prev.x, controlPoints[i].prev.y,
                        points[i + 1].x, points[i + 1].y
                    );
                    this.ctx.stroke();
                    this.ctx.closePath();
                }

                // now draw the starting quadratic between first and second curve
                this.ctx.beginPath();
                this.ctx.moveTo(points[0].x, points[0].y);
                this.ctx.quadraticCurveTo(
                    controlPoints[0].prev.x, controlPoints[0].prev.y,
                    points[1].x, points[1].y
                );
                this.ctx.stroke();
                this.ctx.closePath();

                // now draw final quadratic curve, between last and the point before the last.
                this.ctx.beginPath();
                this.ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);

                this.ctx.quadraticCurveTo(
                    controlPoints[controlPoints.length - 1].next.x,
                    controlPoints[controlPoints.length - 1].next.y,
                    points[points.length - 2].x, points[points.length - 2].y
                );
                this.ctx.stroke();
                this.ctx.closePath();


            } else {
                for (let p = 0; p < points.length - 1; p++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(points[p].x, points[p].y);
                    this.ctx.lineTo(points[p + 1].x, points[p + 1].y);
                    this.ctx.stroke();
                    this.ctx.closePath();
                }
            }

            // draw the points
            for (let p of points) {
                if (this.axisManager.xAxisScaleNumbers.indexOf(p.data.x) > -1) {
                    // convert the data point into a graphical point
                    draw.circle(this.ctx, p.x, p.y, lineWidth);
                }
            }
        }
    }

    calculatePadding() {
        let longestItem = arrays.longest(this.axisManager.xAxisScaleNumbers.map(x => x.toString()));

        // Set the config font size of axis labels, and then we can effectively 'measure' the width of the text
        draw.toTextMode(this.ctx, config.axisLabelFontSize, config.axis_colour);
        this.padding.left = Math.ceil(this.options.padding + this.ctx.measureText(longestItem).width + this.labelFontSize);
        this.padding.bottom = Math.ceil(this.options.padding + this.labelFontSize + this.fontSize());
    }

    draw() {
        /* Draw our Axis', including negative scales & scale labels */
        this.axisManager.draw();

        /* Draw the 'X-Label' & 'Y-Label' labels on the graph canvas */
        this._drawLabels();

        this._drawAxis();
        this._drawData();
    }

    redraw() {
        // clear the rectangle and reset colour
        this.ctx.clearRect(0, 0, this.c_width, this.c_height);
        this.ctx.strokeStyle = config.axis_colour;
        this.ctx.fillStyle = colours.BLACK;

        this.draw();
    }
}

module.exports = function () {
    let Graph = function (id, config, data) {
        return new BasicGraph(id, config, data);
    };

    Graph.Graph = Graph;
    Graph.Colours = require("./utils/colours");

    return Graph;
};
