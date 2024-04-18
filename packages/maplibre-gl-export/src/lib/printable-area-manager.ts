import { type Map as MaplibreMap } from 'maplibre-gl';
import { type Map as MapboxMap } from 'mapbox-gl';
import { Unit } from './map-generator';

export default class PrintableAreaManager {
	private map: MaplibreMap | MapboxMap | undefined;

	private width: number;

	private height: number;

	private unit: string;

	private svgCanvas: SVGElement | undefined;

	private svgPath: SVGElement | undefined;
	
	private rulerSvg: SVGElement | undefined;

	constructor(map: MaplibreMap | MapboxMap | undefined) {
		this.map = map;
		if (this.map === undefined) {
			return;
		}
		this.mapResize = this.mapResize.bind(this);
		this.map.on('resize', this.mapResize);
		const clientWidth = this.map?.getCanvas().clientWidth;
		const clientHeight = this.map?.getCanvas().clientHeight;
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.style.position = 'absolute';
		svg.style.top = '0px';
		svg.style.left = '0px';
		svg.setAttribute('width', `${clientWidth}px`);
		svg.setAttribute('height', `${clientHeight}px`);
		svg.id = "print-preview-fill";
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('style', 'fill:#040505;stroke-width:0');
		path.setAttribute('fill-opacity', '0.76');
		svg.append(path);
		this.map?.getCanvasContainer().appendChild(svg);
		this.svgCanvas = svg;
		this.svgPath = path;
		// Create the ruler SVG element
		const rulerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		rulerSvg.style.position = 'absolute';
		rulerSvg.style.top = '0px';
		rulerSvg.style.left = '0px';
		rulerSvg.setAttribute('width', `${clientWidth}px`);
		rulerSvg.setAttribute('height', '20px'); // Adjust the height as needed
		this.map?.getCanvasContainer().appendChild(rulerSvg);
		this.rulerSvg = rulerSvg;
	}

	private mapResize() {
		this.generateCutOut();
	}

	public updateArea(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.unit = Unit.mm;
		this.generateCutOut();
	}

	private generateCutOut() {
		if (this.map === undefined || this.svgCanvas === undefined || this.svgPath === undefined) {
			return;
		}
		const width = this.toPixels(this.width);
		const height = this.toPixels(this.height);
		const clientWidth = this.map?.getCanvas().clientWidth;
		const clientHeight = this.map?.getCanvas().clientHeight;
		const startX = clientWidth / 2 - width / 2;
		const endX = startX + width;
		const startY = clientHeight / 2 - height / 2;
		const endY = startY + height;

		this.svgCanvas.setAttribute('width', `${clientWidth}px`);
		this.svgCanvas.setAttribute('height', `${clientHeight}px`);
		this.svgPath.setAttribute(
			'd',
			`M 0 0 L ${clientWidth} 0 L ${clientWidth} ${clientHeight} L 0 ${clientHeight} M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY} L ${endX} ${startY}`
		);
		
		this.drawRuler();
	}

	public destroy() {
		if (this.svgCanvas !== undefined) {
			this.svgCanvas.remove();
			this.svgCanvas = undefined;
		}

		if (this.rulerSvg !== undefined) {
			this.rulerSvg.remove();
			this.rulerSvg = undefined;
		}

		if (this.map !== undefined) {
			this.map = undefined;
		}
	}

	/**
	 * Convert mm/inch to pixel
	 * @param length mm/inch length
	 * @param conversionFactor DPI value. default is 96.
	 */
	private toPixels(length: number, conversionFactor = 96) {
		if (this.unit === Unit.mm) {
			conversionFactor /= 25.4;
		}
		return conversionFactor * length;
	}

	//if (!clientHeight || !clientWidth) return;
	private drawRuler() {
		if (this.rulerSvg === undefined) return;
	
		// Clear any existing ruler elements
		while (this.rulerSvg.firstChild) {
			this.rulerSvg.removeChild(this.rulerSvg.firstChild);
		}
	
		this.rulerSvg.id = 'print-preview-ruler';
		const clientWidth = this.map?.getCanvas()?.clientWidth;
		const clientHeight = this.map?.getCanvas()?.clientHeight;
		const cutoutWidth = this.toPixels(this.width);
		const cutoutHeight = this.toPixels(this.height);
		if (!clientHeight || !clientWidth) return;
		const startX = clientWidth / 2 - cutoutWidth / 2;
		const endX = startX + cutoutWidth;
		const startY = clientHeight / 2 - cutoutHeight / 2;
		const endY = startY + cutoutHeight;
	
		if (clientWidth && clientHeight) {
			this.addRulerTickMarks(cutoutWidth, cutoutHeight, startX, endX, startY, endY);
			this.addRulerLabels(cutoutWidth, cutoutHeight, startX, endX, startY, endY);
		}
	}

	private addRulerLabels(cutoutWidth, cutoutHeight, startX, endX, startY, endY) {
		if (this.rulerSvg === undefined) return;

		const inchesToMm = 25.4; // 1 inch = 25.4 mm
		const tickSpacingInInches = 1; // Desired spacing between ticks in inches
		const tickSpacingInMm = tickSpacingInInches * inchesToMm;
		const tickLength = this.toPixels(tickSpacingInMm);
		// const majorTickLengthInMm = 3;
		// const width = '1';
		const labelOffset = 6; // Offset for the label from the tick mark

		// Draw the ruler tick marks and labels on the top side
		for (let i = 0; i <= cutoutWidth; i += tickLength) {
			// this.rulerSvg.appendChild(this.createLine(startX + i, startY, startX + i, startY - this.toPixels(majorTickLengthInMm), '#000000', width));
			const label = this.createLabel(startX + i, startY - labelOffset, `${i / tickLength * tickSpacingInInches}`);
			label.classList.add('tick-top');
			this.rulerSvg.appendChild(label);
		}

		// Draw the ruler tick marks and labels on the right side
		for (let i = 0; i <= cutoutHeight; i += tickLength) {
			// this.rulerSvg.appendChild(this.createLine(endX, startY + i, endX + this.toPixels(majorTickLengthInMm), startY + i, '#000000', width));
			const label = this.createLabel(endX + labelOffset, startY + i, `${i / tickLength * tickSpacingInInches}`, 90);
			label.classList.add('tick-right');
			this.rulerSvg.appendChild(label);
		}

		// Draw the ruler tick marks and labels on the bottom side
		for (let i = 0; i <= cutoutWidth; i += tickLength) {
			// this.rulerSvg.appendChild(this.createLine(startX + i, endY, startX + i, endY + this.toPixels(majorTickLengthInMm), '#000000', width));
			const label = this.createLabel(startX + i, endY + labelOffset, `${i / tickLength * tickSpacingInInches}`);
			label.classList.add('tick-bottom');
			this.rulerSvg.appendChild(label);
		}

		// Draw the ruler tick marks and labels on the left side
		for (let i = 0; i <= cutoutHeight; i += tickLength) {
			// this.rulerSvg.appendChild(this.createLine(startX, startY + i, startX - this.toPixels(majorTickLengthInMm), startY + i, '#000000', width));
			const label = this.createLabel(startX - labelOffset, startY + i, `${i / tickLength * tickSpacingInInches}`, -90);
			label.classList.add('tick-left');
			this.rulerSvg.appendChild(label);
		}
	}

	public addRulerTickMarks(cutoutWidth, cutoutHeight, startX, endX, startY, endY) {
		if (this.rulerSvg === undefined) return;

		const inchesToMm = 25.4; // 1 inch = 25.4 mm
		const tickSpacingInInches = 0.25; // Desired spacing between ticks in inches
		const tickSpacingInMm = tickSpacingInInches * inchesToMm;
		const tickLength = this.toPixels(tickSpacingInMm);
		const majorTickLengthInMm = 3.2;
		const minorTickLengthInMm = 1.2;
		const width = '1';
		const color = '#babbbd';

		// Draw the ruler tick marks and labels on the top side
		let n = 0;
		for (let i = 0; i <= cutoutWidth; i += tickLength) {
			let currentTickLength = minorTickLengthInMm; // Default to minor tick length
			const tickInInches = (n * tickSpacingInInches);
			n++;
			if (tickInInches % 1 === 0) {
				continue; // Skip whole numbers
			} else if (tickInInches % 1 === 0.25 || i % 1 === 0.75) {
				currentTickLength = minorTickLengthInMm; // Use minor tick length for 0.25 and 0.75
			} else if (tickInInches % 1 === 0.5) {
				currentTickLength = majorTickLengthInMm; // Use major tick length for 0.5
			}
			this.rulerSvg.appendChild(this.createLine(startX + i, startY, startX + i, startY - this.toPixels(currentTickLength), color, width));
		}

		// Draw the ruler tick marks and labels on the right side
		n = 0;
		for (let i = 0; i <= cutoutHeight; i += tickLength) {
			let currentTickLength = minorTickLengthInMm; // Default to minor tick length
			const tickInInches = (n * tickSpacingInInches);
			n++;
			if (tickInInches % 1 === 0) {
				continue; // Skip whole numbers
			} else if (tickInInches % 1 === 0.25 || i % 1 === 0.75) {
				currentTickLength = minorTickLengthInMm; // Use minor tick length for 0.25 and 0.75
			} else if (tickInInches % 1 === 0.5) {
				currentTickLength = majorTickLengthInMm; // Use major tick length for 0.5
			}
			this.rulerSvg.appendChild(this.createLine(endX, startY + i, endX + this.toPixels(currentTickLength), startY + i, color, width));
		}

		// Draw the ruler tick marks and labels on the bottom side
		n = 0;
		for (let i = 0; i <= cutoutWidth; i += tickLength) {
			let currentTickLength = minorTickLengthInMm; // Default to minor tick length
			const tickInInches = (n * tickSpacingInInches);
			n++;
			if (tickInInches % 1 === 0) {
				continue; // Skip whole numbers
			} else if (tickInInches % 1 === 0.25 || i % 1 === 0.75) {
				currentTickLength = minorTickLengthInMm; // Use minor tick length for 0.25 and 0.75
			} else if (tickInInches % 1 === 0.5) {
				currentTickLength = majorTickLengthInMm; // Use major tick length for 0.5
			}
			this.rulerSvg.appendChild(this.createLine(startX + i, endY, startX + i, endY + this.toPixels(currentTickLength), color, width));
		}

		// Draw the ruler tick marks and labels on the left side
		n = 0;
		for (let i = 0; i <= cutoutHeight; i += tickLength) {
			let currentTickLength = minorTickLengthInMm; // Default to minor tick length
			const tickInInches = (n * tickSpacingInInches);
			n++;
			if (tickInInches % 1 === 0) {
				continue; // Skip whole numbers
			} else if (tickInInches % 1 === 0.25 || i % 1 === 0.75) {
				currentTickLength = minorTickLengthInMm; // Use minor tick length for 0.25 and 0.75
			} else if (tickInInches % 1 === 0.5) {
				currentTickLength = majorTickLengthInMm; // Use major tick length for 0.5
			}
			this.rulerSvg.appendChild(this.createLine(startX, startY + i, startX - this.toPixels(currentTickLength), startY + i, color, width));
		}
	}

	private createLabel(x: number, y: number, textContent: string, rotate?: number) {
		const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		label.setAttribute('x', `${x}`);
		label.setAttribute('y', `${y}`);
		label.setAttribute('text-anchor', 'middle');
		label.setAttribute('alignment-baseline', 'middle');
		label.setAttribute('fill', '#bbc0cb');
		label.setAttribute('font-weight', '700');
		label.setAttribute('font-size', '8px');
		label.setAttribute('font-family', 'Inter, Helvetica, Arial, sans-serif');
		label.textContent = textContent;
		
		if (rotate !== undefined) {
			label.setAttribute('transform', `rotate(${rotate} ${x} ${y})`);
		}
		return label;
	}

	private createLine(x1, y1, x2, y2, color, w) {
		const aLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		aLine.setAttribute('x1', x1);
		aLine.setAttribute('y1', y1);
		aLine.setAttribute('x2', x2);
		aLine.setAttribute('y2', y2);
		aLine.setAttribute('stroke-dasharray', '5,5');
		aLine.setAttribute('stroke', color);
		aLine.setAttribute('stroke-width', w);
		return aLine;
	}
}
