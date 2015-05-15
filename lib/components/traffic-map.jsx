"use strict";

var React = require("react/addons");
var _ = require("underscore");

var Map = require("./map");

/**
 * Props:
 *
 * topology:
 *     Pass in the topology structure.
 *         Nodes:
 *             - type
 *         Edges:
 *             - source (refers to node name)
 *             - target (refers to node name)
 *             - capacity (string)
 *             - total_capacity (string)
 *
 *  nodeSizeMap:
 *      A mapping from the node type field to a size to draw the shape
 *
 *  edgeThinknessMap:
 *      "capacity" within the tologogy edges is a string, such as "100G". You can pass in a
 *      a edgeThinknessMap that is used to look up the capacity as a line thickness for rendering
 *      the edges.
 *
 *  edgeShapeMap:
 *      A mapping of the edge name (which is source + "--" + target) to a dict of edge shape
 *      options.
 *          - shape (either "linear" or "curved")
 *          - direction (if curved, either "left" or "right")
 *          - offset (if curved, the amount of curve, which is pixel offset from a straight line
 *                    between the source and target at the midpoint)
 *      e.g.
 *          {
 *            "AMST--BOST": {
 *              "shape": "curved",
 *              "direction": "right",
 *              "offset": 15
 *          }
 */

var TrafficMap = React.createClass({

    getDefaultProps: function() {
        return {
            edgeThinknessMap: {
                "100G": 5,
                "10G":  3,
                "1G":   1.5,
                "subG": 1
            },
            edgeColorMap: [],
            nodeSizeMap: {},
            nodeShapeMap: {},
            edgeShapeMap: {},
            selected: false,
            shape: "circle",
            stylesMap: {}
        };
    },

    _nodeSize(name) {
        return this.props.nodeSizeMap[name] || 7;
    },

    _nodeShape(name) {
        return this.props.nodeShapeMap[name] || "circle";
    },

    _edgeThickness(capacity) {
        return this.props.edgeThinknessMap[capacity] || 5;
    },

    _edgeShape(name) {
        if (_.has(this.props.edgeShapeMap, name)) {
            return this.props.edgeShapeMap[name].shape;
        } else {
            return "linear";
        }
    },

    _edgeCurveDirection(name) {
        var direction;
        if (_.has(this.props.edgeShapeMap, name)) {
            if (this.props.edgeShapeMap[name].shape === "curved") {
                return this.props.edgeShapeMap[name].direction;
            }
        }
        return direction;
    },

    _edgeCurveOffset(name) {
        var offset;
        if (_.has(this.props.edgeShapeMap, name)) {
            if (this.props.edgeShapeMap[name].shape === "curved") {
                return this.props.edgeShapeMap[name].offset;
            }
        }
        return offset;
    },

    _selectEdgeColor: function(bps) {
        var gbps = bps / 1.0e9;
        for(var i = 0; i < this.props.edgeColorMap.length; i++) {
            var row = this.props.edgeColorMap[i];
            if (gbps >= row.range[0]) {
                return row.color;
            }
        }
        return "#C9CACC";
    },

    _normalizedTopology: function() {
        var topology = {};

        if (_.isNull(this.props.topology)) {
            return null;
        }

        //Extents of the raw topology for scaling into width and height of the map
        var min_x = _.min(this.props.topology.nodes, function(node) { return node.x }).x;
        var min_y = _.min(this.props.topology.nodes, function(node) { return node.y }).y;
        var max_x = _.max(this.props.topology.nodes, function(node) { return node.x }).x;
        var max_y = _.max(this.props.topology.nodes, function(node) { return node.y }).y;
        max_x -= min_x;
        max_y -= min_y;

        //Create a node list
        topology.nodes = _.map(this.props.topology.nodes, (node) => {

            //Scale the node positions onto a normalized 0 to 1 scale
            node.x = (node.x - min_x)/max_x;
            node.y = (node.y - min_y)/max_y;

            //Radius is based on the type of node, given in the nodeSizeMap
            node.radius = this._nodeSize[node.type];
            
            node.labelPosition = node.label_position;
            node.style = this.props.stylesMap[node.type].node;
            node.labelStyle = this.props.stylesMap[node.type].label;
            node.shape = this._nodeShape(node.name);
            return node;
        });

        //Create the tologogy list
        topology.edges = _.map(this.props.topology.edges, (edge) => {
            var edgeName = edge.source + "--" + edge.target;
            return {
                width: this._edgeThickness(edge.capacity),
                classed: edge.capacity,
                source: edge.source,
                target: edge.target,
                totalCapacity: edge.total_capacity,
                ifaces: edge.ifaces,
                name: edgeName,
                shape: this._edgeShape(edgeName),
                curveDirection: this._edgeCurveDirection(edgeName),
                offset: this._edgeCurveOffset(edgeName)
            }
        });

        //Colorize the topology
        if (this.props.traffic) {
            _.each(topology.edges, (edge) => {
                var sourceTargetName = edge.source + "--" + edge.target;
                var targetSourceName = edge.target + "--" + edge.source;
                var sourceTargetTraffic = this.props.traffic.get(sourceTargetName);
                var targetSourceTraffic = this.props.traffic.get(targetSourceName);
                edge.sourceTargetColor = this._selectEdgeColor(sourceTargetTraffic);
                edge.targetSourceColor = this._selectEdgeColor(targetSourceTraffic);
            });
        }

        topology.name = this.props.topology.name;
        topology.description = this.props.topology.description;

        return topology;
    },

    render: function() {
        var topo = this._normalizedTopology();
        return (
            <Map topology={topo}
                 width={this.props.width}
                 height={this.props.height}
                 margin={this.props.margin}
                 edgeDrawingMethod={"bidirectionalArrow"}
                 onSelectionChange={this.handleSelectionChanged} />
        );
    }
});

module.exports = TrafficMap;