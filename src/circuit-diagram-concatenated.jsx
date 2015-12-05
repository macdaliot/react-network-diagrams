/**
 *  Copyright (c) 2015, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from "react";
import _ from "underscore";
import { Directions } from "./constants.js";
import Endpoint from "./circuit-diagram-endpoint";
import Connection from "./circuit-diagram-connection";
import Navigate from "./circuit-diagram-navigate";

/**
 * Draw a Concatenated circuit
 *
 * This component determines the (x1, y1), (x2, y2) coordinates on the page
 * and then renders a group of circuits by combining the
 * connection and endpoint props. Connection shape, style, and label information,
 * are passed in as props.
 *
 * This is of the form:
 *     [endpoint, connection, endpoint, connection, endpoint, ...]
 */
export default React.createClass({

    getDefaultProps() {
        return {
            width: 851,
            height: 250,
            disabled: false,
            titleOffsetX: 10,
            titleOffsetY: 15,
            margin: 100,
            noNavigate: false,
            squareWidth: 25,
            roundedX: 5,
            roundedY: 5
        };
    },

    renderCircuitTitle(title) {
        const titleStyle = {
            textAnchor: "left",
            fill: "#9D9D9D",
            fontFamily: "verdana, sans-serif",
            fontSize: 14
        };

        if (!this.props.hideTitle) {
            return (
                <text className="circuit-title"
                      key="circuit-title"
                      style={titleStyle}
                      x={this.props.titleOffsetX}
                      y={this.props.titleOffsetY}>
                      {title}
                </text>
            );
        } else {
            return null;
        }
    },

    renderParentNavigation(parentId) {
        if (parentId) {
            return (
                <g>
                    <Navigate
                        direction={Directions.NORTH}
                        ypos={0}
                        width={this.props.width}
                        height={this.props.height}
                        id={this.props.parentId}
                        onSelectionChange={this.props.onSelectionChange} />
                </g>
            );
        } else {
            return null;
        }
    },

    renderDisabledOverlay(disabled) {
        const style = {fill: "#FDFDFD", fillOpacity: 0.65};
        if (disabled) {
            return (
                <rect
                    className="circuit-overlay"
                    style={style}
                    x="0"
                    y="0"
                    width={this.props.width}
                    height={this.props.height}/>
            );
        } else {
            return null;
        }
    },

    renderCircuitElements() {
        const elements = [];

        // determine the initial position
        const y1 = this.props.height / 4;
        const y2 = y1;
        let x1 = this.props.margin;
        let x2 = this.props.width - this.props.margin;
        const memberList = this.props.memberList;

        /* Since squares may be a different width than other connections, and may appear
         * at different positions inside the concatenation, we need to determine
         * the total combined squareWidth of all the square connectors, then subtract that
         * from the total available width.  The remaining length divided by the number
         * of non-square segments is how long the remaining non-square segments can be
         */

        const memberCount = memberList.length;
        let squareMemberCount = 0;

        const totalWidth = this.props.width - this.props.margin * 2;
        let totalSquareWidth = 0;

        _.each(memberList, member => {
            if (_.has(member.styleProperties, "squareWidth")) {
                totalSquareWidth += member.styleProperties.squareWidth;
                squareMemberCount += 1;
            }
        });

        const lineWidth = (totalWidth - totalSquareWidth) / (memberCount - squareMemberCount);

        // Draw the first endpoint

        elements.push(
            <Endpoint x={x1}
                      y={y1}
                      key={"endpoint-0"}
                      style={memberList[0].endpointStyle}
                      labelPosition={this.props.endpointLabelPosition}
                      offset={this.props.endpointLabelOffset}
                      label={memberList[0].endpointLabelA} />
        );

        /* since the Z of each member is shared with the A of the next member, render only
         * the Z for each member starting with the first member
         */

        _.each(memberList, (member, memberIndex) => {
            if (member.styleProperties.lineShape === "square") {
                x2 = x1 + member.styleProperties.squareWidth;
            } else {
                x2 = x1 + lineWidth;
            }
            elements.push(
                <Endpoint x={x2}
                          y={y2}
                          key={"endpoint-" + (memberIndex + 1)}
                          style={member.endpointStyle}
                          labelPosition={this.props.endpointLabelPosition}
                          offset={this.props.endpointLabelOffset}
                          label={member.endpointLabelZ} />
            );
            x1 = x2;
        });

        // reset x1
        x1 = this.props.margin;

        // Collect all the connections

        _.each(memberList, (member, memberIndex) => {
            const roundedX = member.styleProperties.roundedX || this.props.roundedX;
            const roundedY = member.styleProperties.roundedY || this.props.roundedY;

            if (member.styleProperties.lineShape === "square") {
                x2 = x1 + member.styleProperties.squareWidth;
            } else {
                x2 = x1 + lineWidth;
            }
            elements.push(
                <Connection x1={x1}
                            x2={x2}
                            y1={y1}
                            y2={y2}
                            key={"circuit-" + memberIndex}
                            roundedX={roundedX}
                            roundedY={roundedY}
                            style={member.styleProperties.style}
                            lineShape={member.styleProperties.lineShape}
                            label={member.circuitLabel}
                            labelPosition={this.props.connectionLabelPosition}
                            labelOffsetY={this.props.yOffset}
                            noNavigate={member.styleProperties.noNavigate}
                            navTo={member.navTo}
                            size={member.styleProperties.size}
                            centerLine={member.styleProperties.centerLine}
                            onSelectionChange={this.props.onSelectionChange}/>
            );
            x1 = x2;
        });
        return (
            <g>
                {elements}
            </g>
        );
    },

    render() {
        const circuitContainer = {
            normal: {
                borderTopStyle: "solid",
                borderBottomStyle: "solid",
                borderWidth: 1,
                borderTopColor: "#FFFFFF",
                borderBottomColor: "#EFEFEF",
                width: "100%",
                height: this.props.height
            },
            disabled: {
                width: "100%",
                height: this.props.height
            }
        };

        let className = "circuit-container";
        let svgStyle;

        if (this.props.disabled) {
            className += " disabled";
            svgStyle = circuitContainer.disabled;
        } else {
            svgStyle = circuitContainer.normal;
        }

        return (
            <svg className={className} style={svgStyle} onClick={this._deselect}>
                {this.renderCircuitTitle(this.props.title)}
                {this.renderCircuitElements()}
                {this.renderParentNavigation(this.props.parentId)}
                {this.renderDisabledOverlay(this.props.disabled)}
            </svg>
        );
    }
});
