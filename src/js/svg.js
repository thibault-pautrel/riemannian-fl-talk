const NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// turns [{x,y}, ...] into an SVG path, rounded to 2 decimals
export function polyline(points, close = false) {
  let d = '';
  for (let i = 0; i < points.length; i++) {
    d += (i === 0 ? 'M' : 'L') + points[i].x.toFixed(2) + ' ' + points[i].y.toFixed(2);
  }
  return close ? d + 'Z' : d;
}