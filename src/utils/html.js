import {isUndefOrNull} from "./object";


export function findCanvas(id) {
  let element = document.getElementById(id);
  let canvas;

  // find the canvas in the provided canvas
  try {
    for (let childNode of element.childNodes) {
      const tagName = childNode.nodeName.toLowerCase();
      if (tagName === "canvas") {
        canvas = childNode;
        break;
      }
    }
  } catch (e) {
    if (isUndefOrNull(canvas)) {
      throw Error(`Graph Container '${id}' doesn't exist.\n` + e);
    }
  }

  // DOM modifications
  if (!isUndefOrNull(canvas)) {
    element.style.width = canvas.width.toString() + "px";
  } else {
    throw Error(
      `Graph Container '${id}' doesn't contain <canvas> element.`
    );
  }

  return canvas;
}

export function setupCanvas(canvas) {
  // Get the device pixel ratio, falling back to 1.
  const dpr = window.devicePixelRatio || 1;

  // Give the canvas pixel dimensions of their CSS and set canvas dimensions to
  // size * the device pixel ratio.

  const ctx = canvas.getContext("2d");
  canvas.width *= dpr;
  canvas.height *= dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return ctx;
}
