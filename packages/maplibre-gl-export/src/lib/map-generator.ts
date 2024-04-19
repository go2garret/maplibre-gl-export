/*
 * mpetroff/print-maps
 * https://github.com/mpetroff/print-maps
 *
 * I used the source code from the above repository. Thanks so much!
 *
 * -----LICENSE------
 * Print Maps - High-resolution maps in the browser, for printing
 * Copyright (c) 2015-2020 Matthew Petroff
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { jsPDF } from 'jspdf';
import { Map as MaplibreMap } from 'maplibre-gl';
import 'js-loading-overlay';
import html2canvas from 'html2canvas';

export const Format = {
	JPEG: 'jpg',
	PNG: 'png',
	PDF: 'pdf',
	SVG: 'svg'
} as const;
type Format = (typeof Format)[keyof typeof Format];

export const Unit = {
	// don't use inch unit. because page size setting is using mm unit.
	in: 'in',
	mm: 'mm'
} as const;
type Unit = (typeof Unit)[keyof typeof Unit];

export const Size = {
	// A0, A1, B0, B1 are not working well.
	// A0: [1189, 841],
	// A1: [841, 594],
	LETTER: [279, 216], // 8.5x11 - works
	//TABLOID: [432,279] // 11x17 - not working currently prints to 11.68x8.27 in landscape
	A2: [594, 420],
	A3: [420, 297],
	A4: [297, 210],
	A5: [210, 148],
	A6: [148, 105],
	// B0: [1414, 1000],
	// B1: [1000, 707],
	B2: [707, 500],
	B3: [500, 353],
	B4: [353, 250],
	B5: [250, 176],
	B6: [176, 125]
} as const;
type Size = (typeof Size)[keyof typeof Size];

export const PageOrientation = {
	Landscape: 'landscape',
	Portrait: 'portrait'
} as const;
type PageOrientation = (typeof PageOrientation)[keyof typeof PageOrientation];

export const DPI = {
	72: 72,
	96: 96,
	200: 200,
	300: 300,
	400: 400
} as const;
type DPI = (typeof DPI)[keyof typeof DPI];

// type RenderElements = {
//     [key: string]: HTMLElement | null;
// };

export default class MapGenerator {
	private map: MaplibreMap;

	private width: number;

	private height: number;

	private dpi: number;

	private format: string;

	private unit: Unit;

	private fileName: string;

	// private getRenderElements: (() => RenderElements) | null = null; // Initialize as null

	/**
	 * Constructor
	 * @param map MaplibreMap object
	 * @param size layout size. default is A4
	 * @param dpi dpi value. deafult is 300
	 * @param format image format. default is PNG
	 * @param unit length unit. default is mm
	 * @param fileName file name. default is 'map'
	 */
	constructor(
		map: MaplibreMap,
		size: Size = Size.A4,
		dpi = 300,
		format: string = Format.PNG.toString(),
		unit: Unit = Unit.mm,
		fileName = 'map'
	) {
		this.map = map;
		this.width = size[0];
		this.height = size[1];
		this.dpi = dpi;
		this.format = format;
		this.unit = unit;
		this.fileName = fileName;
	}

	/**
	 * Adds an element to the layoutCanvas.
	 * @param ctx The canvas 2D rendering context.
	 * @param src The source of the element (e.g., image URL).
	 * @param x The x-coordinate of the element.
	 * @param y The y-coordinate of the element.
	 * @param width The width of the element.
	 * @param height The height of the element.
	 */
	// addElementToLayoutCanvas(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, width: number, height: number) {
	// 	const img = new Image();
	// 	img.src = src;
	// 	img.onload = () => {
	// 		ctx.drawImage(img, x, y, width, height);
	// 	};
	// }

	async addElementToLayoutCanvas(
		renderMap: MaplibreMap,
		layoutCanvas: HTMLCanvasElement,
		mapCanvas: HTMLCanvasElement,
		canvas: HTMLCanvasElement,
		layoutCtx: CanvasRenderingContext2D
	) {
		// eslint-disable-next-line
		const this_ = this;

		const logo = new Image();
		logo.src = '/images/logo/logo_xs.png';
		await logo.decode();

		const xMin = mapCanvas.width - logo.width;
		const yMin = mapCanvas.height - logo.height;
		//const yMin = 0;
		layoutCtx?.drawImage(logo, xMin, yMin, logo.width, logo.height);

		// Add title to the canvas
		//await this_.addTitleToCanvas(layoutCtx, mapCanvas.width, mapCanvas.height);
		await this_.addSectionToCanvas(layoutCtx, mapCanvas.width);

		// Get the data URL of the layoutCanvas
		const layoutDataURL = layoutCanvas.toDataURL();

		// Get Final Canvas Context
		const finalCtx = canvas.getContext('2d')!;

		// Draw the mapCanvas on the new canvas
		finalCtx.drawImage(mapCanvas, 0, 0);

		// Set the globalCompositeOperation to 'source-over' to overlay the layoutCanvas
		finalCtx.globalCompositeOperation = 'source-over';

		// Draw the layoutCanvas data URL on the new canvas
		const img = new Image();
		img.src = layoutDataURL;
		img.onload = () => {
			finalCtx.drawImage(img, 0, 0);
			this_.exportCanvas(renderMap, canvas);
		};
	}

	// Function to add a title to the canvas
	/*async addTitleToCanvas(ctx: CanvasRenderingContext2D) {
		const userObjectContainers = document.querySelectorAll<HTMLElement>('.printer-layout-element');

		console.log("USER OBJECTS", userObjectContainers);
	  
		const addElementToCanvas = async (element: HTMLElement, x: number, y: number) => {
			if (element instanceof HTMLImageElement) {
				// Handle the image separately
				await addImageToCanvas(element, x, y);
			} else {
				const canvas = await html2canvas(element, {
					allowTaint: true,
					foreignObjectRendering: true,
					backgroundColor: 'transparent' // Set the canvas background color to transparent
				});
				if (canvas.width > 0 && canvas.height > 0) {
					ctx.drawImage(canvas, x, y);
				} else {
					console.error('Failed to render element:', element);
				}
			}
		};
		
		const addImageToCanvas = async (img: HTMLImageElement, x: number, y: number) => {
			return new Promise<void>((resolve) => {
				const image = new Image();
				image.crossOrigin = 'anonymous'; // Enable CORS for the image
				image.src = img.src;
				image.onload = () => {
					ctx.drawImage(image, x, y);
					resolve();
				};
				image.onerror = () => {
					console.error('Failed to render image:', img);
					resolve();
				};
			});
		};
	  
		let currentX = 0;
		let currentY = 0;
		const spacing = 20;
	  
		for (let i = 0; i < userObjectContainers.length; i++) {
		  await addElementToCanvas(userObjectContainers[i], currentX, currentY);
	  
		  // Update the position for the next element
		  currentX += userObjectContainers[i].offsetWidth + spacing;
	  
		  // If the current element plus the next one would exceed the canvas width, move to the next row
		  if (currentX + userObjectContainers[i].offsetWidth + spacing > ctx.canvas.width) {
			currentX = 0;
			currentY += userObjectContainers[i].offsetHeight + spacing;
		  }
		}
	  }*/

	getLayoutContainer(position) {
		const layoutContainer = document.createElement('div');
		layoutContainer.style.cssText = `
			background-color: transparent;
			position: absolute;
			left: 0;
			margin: 0;
			padding: 0;
			display: block;
			font-family: "Inter, Arial, Helvetica, sans-serif";
			font-weight: 400;
			background-color: transparent;
			border: none;
			box-sizing: content-box;
			justify-content: space-between;
		`;
		if (position == 'top') {
			layoutContainer.style.top = '0';
			layoutContainer.style.height = this.toPixels(this.height / 2);
			layoutContainer.style.boxShadow = 'inset 0 0 5px 3px green';
			layoutContainer.style.display = 'flex';
		} else if (position == 'bottom') {
			layoutContainer.style.top = this.toPixels(this.height / 2);
			layoutContainer.style.height = this.toPixels(this.height / 2);
			layoutContainer.style.boxShadow = 'inset 0 0 5px 3px yellow';
			layoutContainer.style.display = 'flex';
		} else if (position == 'full') {
			layoutContainer.style.top = '0';
			layoutContainer.style.height = this.toPixels(this.height);
			layoutContainer.style.boxShadow = 'inset 0 0 5px 3px purple';
			layoutContainer.style.display = 'block';
		}
		layoutContainer.style.width = this.toPixels(this.width);
		return layoutContainer;
	}

	getLayoutSection() {
		const layoutSectionContainer = document.createElement('div');
		layoutSectionContainer.className = 'layout-section-container';

		const layoutSection = document.createElement('section');
		layoutSectionContainer.appendChild(layoutSection);

		// layoutSection.style.width = this.toPixels(this.width / 2);
		return layoutSectionContainer;
	}

	updateInputElements(element: HTMLElement): HTMLElement {
		if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
			const div = document.createElement('div');
			div.innerHTML =
				element instanceof HTMLInputElement
					? element.value
					: (element as HTMLTextAreaElement).value;
			div.style.cssText = element.style.cssText;
			console.log('Input element style', element.style);
			// div.style.border = '3px solid red';
			div.style.display = 'flex';
			div.style.alignItems = 'center';
			div.style.minHeight = 'unset';
			div.style.maxHeight = 'unset';
			div.style.height = 'unset';
			div.style.width = '100%';
			div.style.fontFamily = 'Inter, Arial, Helvetica, sans-serif';
			div.style.padding = '0';
			div.style.margin = '10px';
			return div;
		}
		element.style.margin = '10px';
		return element;
	}

	async addSectionToCanvas(ctx: CanvasRenderingContext2D, totalWidth) {
		const userObjectContainers = document.querySelectorAll<HTMLElement>('.printer-layout-element');

		console.log('TOP RIGHT USER OBJECTS', userObjectContainers);
		const topRightSection = this.getLayoutSection();
		document.body.appendChild(topRightSection);

		const copyHtmlElement = (element: HTMLElement): HTMLElement => {
			const clone = element.cloneNode(true) as HTMLElement;
			return this.updateInputElements(clone);
		};

		// Append all userObjectContainers to the layoutContainer
		const section = topRightSection.querySelector('section');
		if (!section) return;
		userObjectContainers.forEach((container) => {
			const newContainer = copyHtmlElement(container);
			section.appendChild(newContainer);
		});

		// Render the layoutContainer onto the canvas
		const canvas = await html2canvas(topRightSection, {
			allowTaint: true,
			foreignObjectRendering: true,
			backgroundColor: 'rgba(0,0,0,0)' // Set the canvas background color to transparent
		});

		if (canvas.width <= 0 || canvas.height <= 0) {
			console.error('Failed to render layoutContainer');
			document.body.removeChild(topRightSection);
			return;
		}

		const xMin = totalWidth - canvas.width;
		ctx?.drawImage(canvas, xMin, yMin, canvas.width, canvas.height);

		// Remove the layoutContainer from the document
		document.body.removeChild(topRightSection);
	}

	// async addTitleToCanvas(ctx: CanvasRenderingContext2D, width, height) {
	// 	const userObjectContainers = document.querySelectorAll<HTMLElement>('.printer-layout-element');

	// 	console.log('USER OBJECTS', userObjectContainers);

	// 	const copyHtmlElement = (element: HTMLElement): HTMLElement => {
	// 		const clone = element.cloneNode(true) as HTMLElement;
	// 		return this.updateInputElements(clone);
	// 	};

	// 	// Create a new container element to hold all userObjectContainers
	// 	// const  = document.createElement('div');
	// 	// layoutContainer.style.cssText = `
	// 	// 	background-color: transparent;
	// 	// 	position: fixed;
	// 	// 	overflow: hidden;
	// 	// 	`;

	// 	// Create a new container element to hold all userObjectContainers
	// 	const layoutContainerMain = this.getLayoutContainer('full');
	// 	document.body.appendChild(layoutContainerMain);
	// 	const layoutContainerTop = this.getLayoutContainer('top');
	// 	const layoutContainerBottom = this.getLayoutContainer('bottom');
	// 	layoutContainerMain.appendChild(layoutContainerTop);
	// 	layoutContainerMain.appendChild(layoutContainerBottom);

	// 	const topLeftSection = this.getLayoutSection();
	// 	const topRightSection = this.getLayoutSection();
	// 	const bottomLeftSection = this.getLayoutSection();
	// 	const bottomRightSection = this.getLayoutSection();
	// 	layoutContainerTop.appendChild(topLeftSection);
	// 	layoutContainerTop.appendChild(topRightSection);
	// 	layoutContainerBottom.appendChild(bottomLeftSection);
	// 	layoutContainerBottom.appendChild(bottomRightSection);

	// 	// Append all userObjectContainers to the layoutContainer
	// 	userObjectContainers.forEach((container) => {
	// 		const newContainer = copyHtmlElement(container);
	// 		topRightSection.appendChild(newContainer);
	// 	});

	// 	// Render the layoutContainer onto the canvas
	// 	const canvas = await html2canvas(layoutContainerMain, {
	// 		allowTaint: true,
	// 		foreignObjectRendering: true,
	// 		backgroundColor: 'rgba(0,0,0,0)' // Set the canvas background color to transparent
	// 	});

	// 	if (canvas.width <= 0 || canvas.height <= 0) {
	// 		console.error('Failed to render layoutContainer');
	// 		document.body.removeChild(layoutContainerMain);
	// 		return;
	// 	}

	// 	ctx.drawImage(canvas, 0, 0); // Draw the canvas at position (0, 0)

	// 	// Remove the layoutContainer from the document
	// 	document.body.removeChild(layoutContainerMain);
	// }

	exportCanvas(renderMap: MaplibreMap, canvas: HTMLCanvasElement) {
		const actualPixelRatio: number = window.devicePixelRatio;

		const fileName = `${this.fileName}.${this.format}`;
		switch (this.format) {
			case Format.PNG:
				this.toPNG(canvas, fileName);
				break;
			case Format.JPEG:
				this.toJPEG(canvas, fileName);
				break;
			case Format.PDF:
				this.toPDF(renderMap, canvas, fileName);
				break;
			case Format.SVG:
				this.toSVG(canvas, fileName);
				break;
			default:
				console.error(`Invalid file format: ${this.format}`);
				break;
		}

		renderMap.remove();
		const hidden = document.getElementById('hidden-map')!;
		hidden.parentNode?.removeChild(hidden);
		Object.defineProperty(window, 'devicePixelRatio', {
			get() {
				return actualPixelRatio;
			}
		});
		hidden.remove();

		// eslint-disable-next-line
		// @ts-ignore
		JsLoadingOverlay.hide();
		// Clear the loading message
		const loadingDiv = document.querySelector('.export-loading-text');
		loadingDiv?.remove();
	}

	addLoadingMessage() {
		// Create a new div element
		const loadingDiv = document.createElement('div');

		// Add content to the div if needed
		loadingDiv.textContent = 'Exporting map, please wait...';

		// Apply styles using a style object
		const styles = {
			position: 'fixed',
			width: '100%',
			height: '100%',
			zIndex: '9999',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			fontSize: '1.3rem',
			top: '-40px',
			left: '0',
			color: '#ececec'
		};

		loadingDiv.className = 'export-loading-text';

		// Apply styles to the loadingDiv
		Object.assign(loadingDiv.style, styles);

		// Append the loadingDiv to the document body
		document.body.appendChild(loadingDiv);
	}

	/**
	 * Generate and download Map image
	 */
	generate() {
		// eslint-disable-next-line
		const this_ = this;

		// see documentation for JS Loading Overray library
		// https://js-loading-overlay.muhdfaiz.com
		// eslint-disable-next-line
		// @ts-ignore
		JsLoadingOverlay.show({
			overlayBackgroundColor: '#17171a',
			overlayOpacity: '1',
			spinnerIcon: 'ball-pulse',
			spinnerColor: '#ececec',
			spinnerSize: '2x',
			overlayIDName: 'overlay',
			spinnerIDName: 'spinner',
			offsetX: 0,
			offsetY: 0,
			containerID: null,
			lockScroll: true,
			overlayZIndex: 9998,
			spinnerZIndex: 9999
		});

		this.addLoadingMessage();

		// Calculate pixel ratio
		// const actualPixelRatio: number = window.devicePixelRatio;
		Object.defineProperty(window, 'devicePixelRatio', {
			get() {
				return this_.dpi / 96;
			}
		});
		// Create map container
		const hidden = document.createElement('div');
		hidden.className = 'hidden-map';
		hidden.id = 'hidden-map';
		document.body.appendChild(hidden);
		const container = document.createElement('div');
		container.style.width = this.toPixels(this.width);
		container.style.height = this.toPixels(this.height);
		hidden.appendChild(container);

		const style = this.map.getStyle();
		if (style && style.sources) {
			const sources = style.sources;
			Object.keys(sources).forEach((name) => {
				const src = sources[name];
				Object.keys(src).forEach((key) => {
					// delete properties if value is undefined.
					// for instance, raster-dem might has undefined value in "url" and "bounds"
					if (!src[key]) delete src[key];
				});
			});
		}

		// Render map
		const renderMap = new MaplibreMap({
			container,
			style,
			center: this.map.getCenter(),
			zoom: this.map.getZoom(),
			bearing: this.map.getBearing(),
			pitch: this.map.getPitch(),
			interactive: false,
			preserveDrawingBuffer: true,
			fadeDuration: 0,
			attributionControl: false,
			// hack to read transfrom request callback function
			// eslint-disable-next-line
			// @ts-ignore
			transformRequest: (this.map as unknown)._requestManager._transformRequestFn
		});

		// Attempt to load images that were loaded in source map using addImage(). This does not load sprite images.
		// Modification based on https://github.com/watergis/maplibre-gl-export/pull/18
		const images = (this.map.style.imageManager || {}).images || [];
		for (const key of Object.keys(images)) {
			const _image = images[key];

			if (_image?.data) {
				try {
					renderMap.addImage(key, _image?.data);
				} catch (err) {
					console.error(`Error adding image: ${err.message}`);
				}
			}
		}

		renderMap.once('idle', async () => {
			// Create Map Canvas
			const mapCanvas = renderMap.getCanvas();

			// Create the layoutCanvas and draw the logo image on it
			const layoutCanvas = document.createElement('canvas');
			layoutCanvas.width = mapCanvas.width; // Set the width of the layoutCanvas
			layoutCanvas.height = mapCanvas.height; // Set the height of the layoutCanvas
			layoutCanvas.style.boxSizing = 'content-box';

			// Create the Final Canvas
			const canvas = document.createElement('canvas');
			canvas.width = mapCanvas.width;
			canvas.height = mapCanvas.height;

			// Create layout context and draw elements on it
			const layoutCtx = layoutCanvas.getContext('2d')!;

			await this.addElementToLayoutCanvas(
				renderMap,
				layoutCanvas,
				mapCanvas,
				canvas,
				layoutCtx
			).catch((e: Error) => {
				// Handle the error here
				console.error('Error adding element to layout canvas:', e);
			});
		});
	}

	/**
	 * Convert canvas to PNG
	 * @param canvas Canvas element
	 * @param fileName file name
	 */
	private toPNG(canvas: HTMLCanvasElement, fileName: string) {
		const a = document.createElement('a');
		a.href = canvas.toDataURL();
		a.download = fileName;
		a.click();
		a.remove();
	}

	/**
	 * Convert canvas to JPEG
	 * @param canvas Canvas element
	 * @param fileName file name
	 */
	private toJPEG(canvas: HTMLCanvasElement, fileName: string) {
		const uri = canvas.toDataURL('image/jpeg', 0.85);
		const a = document.createElement('a');
		a.href = uri;
		a.download = fileName;
		a.click();
		a.remove();
	}

	/**
	 * Convert Map object to PDF
	 * @param map Map object
	 * @param canvas Canvas element
	 * @param fileName file name
	 */
	private toPDF(map: MaplibreMap, canvas: HTMLCanvasElement, fileName: string) {
		//const canvas = map.getCanvas();
		const pdf = new jsPDF({
			orientation: this.width > this.height ? 'l' : 'p',
			unit: this.unit,
			compress: true,
			format: [this.width, this.height]
		});

		pdf.addImage(
			canvas.toDataURL('image/png'),
			'png',
			0,
			0,
			this.width,
			this.height,
			undefined,
			'FAST'
		);

		const { lng, lat } = map.getCenter();
		pdf.setProperties({
			title: map.getStyle().name,
			subject: `center: [${lng}, ${lat}], zoom: ${map.getZoom()}`,
			creator: 'Mapbox GL Export Plugin',
			author: '(c)Mapbox, (c)OpenStreetMap'
		});

		pdf.save(fileName);
	}

	/**
	 * Convert canvas to SVG
	 * @param canvas Canvas element
	 * @param fileName file name
	 */
	private toSVG(canvas: HTMLCanvasElement, fileName: string) {
		const uri = canvas.toDataURL('image/png');

		const pxWidth = Number(this.toPixels(this.width, this.dpi).replace('px', ''));
		const pxHeight = Number(this.toPixels(this.height, this.dpi).replace('px', ''));

		const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" 
      xmlns:xlink="http://www.w3.org/1999/xlink" 
      version="1.1" 
      width="${pxWidth}" 
      height="${pxHeight}" 
      viewBox="0 0 ${pxWidth} ${pxHeight}" 
      xml:space="preserve">
        <image style="stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;"  
      xlink:href="${uri}" width="${pxWidth}" height="${pxHeight}"></image>
    </svg>`;

		const a = document.createElement('a');
		a.href = `data:application/xml,${encodeURIComponent(svg)}`;
		a.download = fileName;
		a.click();
		a.remove();
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
		return `${conversionFactor * length}px`;
	}
}
