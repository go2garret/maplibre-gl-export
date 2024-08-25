import { type Map as MaplibreMap } from 'maplibre-gl';
import { type Map as MapboxMap } from 'mapbox-gl';
import PrintableAreaManager from './printable-area-manager';
import { ExportLayoutOptions, Unit } from './interfaces';

export default class PrintableAreaRuler extends PrintableAreaManager {
	private rulerSvg: SVGElement | undefined;

	constructor(map: MaplibreMap | MapboxMap | undefined, exportLayoutOptions: ExportLayoutOptions) {
		super(map, exportLayoutOptions);

		if (this.map === undefined) {
			return;
		}

		// Get the client dimensions from the map canvas
		const clientWidth = this.map?.getCanvas().clientWidth;
		const clientHeight = this.map?.getCanvas().clientHeight;

		// Create the ruler SVG element
		const rulerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		rulerSvg.style.position = 'absolute';
		rulerSvg.style.top = '0px';
		rulerSvg.style.left = '0px';
		rulerSvg.setAttribute('width', `${clientWidth}px`);
		rulerSvg.setAttribute('height', `${clientHeight}px`);

		// Append the ruler SVG to the map canvas container
		this.map?.getCanvasContainer().appendChild(rulerSvg);

		// Store a reference to the ruler SVG in the class instance
		this.rulerSvg = rulerSvg;
	}

	public updateArea(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.unit = Unit.mm;
		this.generateCutOut();
	}

	protected generateCutOut() {
		super.generateCutOut();

		this.drawRuler();
	}

	public destroy() {
		super.destroy();

		if (this.rulerSvg !== undefined) {
			this.rulerSvg.remove();
			this.rulerSvg = undefined;
		}
	}

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

	private addRulerLabels(cutoutWidth: number, cutoutHeight: number, startX: number, endX: number, startY: number, endY: number) {
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
			const label = this.createLabel(
				startX + i,
				startY - labelOffset,
				`${(i / tickLength) * tickSpacingInInches}`
			);
			label.classList.add('tick-top');
			this.rulerSvg.appendChild(label);
		}

		// Draw the ruler tick marks and labels on the right side
		for (let i = 0; i <= cutoutHeight; i += tickLength) {
			const label = this.createLabel(
				endX + labelOffset,
				startY + i,
				`${(i / tickLength) * tickSpacingInInches}`,
				90
			);
			label.classList.add('tick-right');
			this.rulerSvg.appendChild(label);
		}

		// Draw the ruler tick marks and labels on the bottom side
		for (let i = 0; i <= cutoutWidth; i += tickLength) {
			const label = this.createLabel(
				startX + i,
				endY + labelOffset,
				`${(i / tickLength) * tickSpacingInInches}`
			);
			label.classList.add('tick-bottom');
			this.rulerSvg.appendChild(label);
		}

		// Draw the ruler tick marks and labels on the left side
		for (let i = 0; i <= cutoutHeight; i += tickLength) {
			const label = this.createLabel(
				startX - labelOffset,
				startY + i,
				`${(i / tickLength) * tickSpacingInInches}`,
				-90
			);
			label.classList.add('tick-left');
			this.rulerSvg.appendChild(label);
		}
	}

	public addRulerTickMarks(cutoutWidth: number, cutoutHeight: number, startX: number, endX: number, startY: number, endY: number) {
		if (this.rulerSvg === undefined) return;

		const inchesToMm = 25.4; // 1 inch = 25.4 mm
		const tickSpacingInInches = 0.25; // Desired spacing between ticks in inches
		const tickSpacingInMm = tickSpacingInInches * inchesToMm;
		const tickLength = this.toPixels(tickSpacingInMm);
		const majorTickLengthInMm = 3.2;
		const minorTickLengthInMm = 1.2;
		const width = 1;
		const color = this.exportLayoutOptions.rulerTickmarkColor ?? "#000000";

		// Draw the ruler tick marks and labels on the top side
		let n = 0;
		for (let i = 0; i <= cutoutWidth; i += tickLength) {
			let currentTickLength = minorTickLengthInMm; // Default to minor tick length
			const tickInInches = n * tickSpacingInInches;
			n++;
			if (tickInInches % 1 === 0) {
				continue; // Skip whole numbers
			} else if (tickInInches % 1 === 0.25 || i % 1 === 0.75) {
				currentTickLength = minorTickLengthInMm; // Use minor tick length for 0.25 and 0.75
			} else if (tickInInches % 1 === 0.5) {
				currentTickLength = majorTickLengthInMm; // Use major tick length for 0.5
			}
			this.rulerSvg.appendChild(
				this.createLine(
					startX + i,
					startY,
					startX + i,
					startY - this.toPixels(currentTickLength),
					color,
					width
				)
			);
		}

		// Draw the ruler tick marks and labels on the right side
		n = 0;
		for (let i = 0; i <= cutoutHeight; i += tickLength) {
			let currentTickLength = minorTickLengthInMm; // Default to minor tick length
			const tickInInches = n * tickSpacingInInches;
			n++;
			if (tickInInches % 1 === 0) {
				continue; // Skip whole numbers
			} else if (tickInInches % 1 === 0.25 || i % 1 === 0.75) {
				currentTickLength = minorTickLengthInMm; // Use minor tick length for 0.25 and 0.75
			} else if (tickInInches % 1 === 0.5) {
				currentTickLength = majorTickLengthInMm; // Use major tick length for 0.5
			}
			this.rulerSvg.appendChild(
				this.createLine(
					endX,
					startY + i,
					endX + this.toPixels(currentTickLength),
					startY + i,
					color,
					width
				)
			);
		}

		// Draw the ruler tick marks and labels on the bottom side
		n = 0;
		for (let i = 0; i <= cutoutWidth; i += tickLength) {
			let currentTickLength = minorTickLengthInMm; // Default to minor tick length
			const tickInInches = n * tickSpacingInInches;
			n++;
			if (tickInInches % 1 === 0) {
				continue; // Skip whole numbers
			} else if (tickInInches % 1 === 0.25 || i % 1 === 0.75) {
				currentTickLength = minorTickLengthInMm; // Use minor tick length for 0.25 and 0.75
			} else if (tickInInches % 1 === 0.5) {
				currentTickLength = majorTickLengthInMm; // Use major tick length for 0.5
			}
			this.rulerSvg.appendChild(
				this.createLine(
					startX + i,
					endY,
					startX + i,
					endY + this.toPixels(currentTickLength),
					color,
					width
				)
			);
		}

		// Draw the ruler tick marks and labels on the left side
		n = 0;
		for (let i = 0; i <= cutoutHeight; i += tickLength) {
			let currentTickLength = minorTickLengthInMm; // Default to minor tick length
			const tickInInches = n * tickSpacingInInches;
			n++;
			if (tickInInches % 1 === 0) {
				continue; // Skip whole numbers
			} else if (tickInInches % 1 === 0.25 || i % 1 === 0.75) {
				currentTickLength = minorTickLengthInMm; // Use minor tick length for 0.25 and 0.75
			} else if (tickInInches % 1 === 0.5) {
				currentTickLength = majorTickLengthInMm; // Use major tick length for 0.5
			}
			this.rulerSvg.appendChild(
				this.createLine(
					startX,
					startY + i,
					startX - this.toPixels(currentTickLength),
					startY + i,
					color,
					width
				)
			);
		}
	}

	private createLabel(x: number, y: number, textContent: string, rotate?: number) {
		const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		label.setAttribute('x', `${x}`);
		label.setAttribute('y', `${y}`);
		label.setAttribute('text-anchor', 'middle');
		label.setAttribute('alignment-baseline', 'middle');
		label.setAttribute('fill', this.exportLayoutOptions.rulerLabelColor ?? '#000000');
		label.setAttribute('font-weight', '700');
		label.setAttribute('font-size', this.exportLayoutOptions.rulerLabelSize ?? '11px');
		label.setAttribute('font-family', 'Inter, Helvetica, Arial, sans-serif');
		label.textContent = textContent;

		if (rotate !== undefined) {
			label.setAttribute('transform', `rotate(${rotate} ${x} ${y})`);
		}
		return label;
	}

	private createLine(x1: number, y1: number, x2: number, y2: number, color: string, w: number) {
		const aLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		aLine.setAttribute('x1', x1.toString());
		aLine.setAttribute('y1', y1.toString());
		aLine.setAttribute('x2', x2.toString());
		aLine.setAttribute('y2', y2.toString());
		aLine.setAttribute('stroke-dasharray', 'none');
		aLine.setAttribute('stroke-linecap', 'round');
		aLine.setAttribute('stroke', color);
		aLine.setAttribute('stroke-width', w.toString());
		return aLine;
	}
}
