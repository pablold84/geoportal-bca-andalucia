export const getCatastroFeatureInfo = async (coordinate, map, catastroLayer) => {
  if (!catastroLayer || !catastroLayer.getVisible()) return null;

  const view       = map.getView();
  const resolution = view.getResolution();
  const projection = view.getProjection();

  try {
    const url = catastroLayer.getSource().getFeatureInfoUrl(
      coordinate,
      resolution,
      projection,
      { 'INFO_FORMAT': 'application/vnd.ogc.gml' }
    );

    if (!url) return null;

    const response    = await fetch(url);
    const contentType = response.headers.get("Content-Type");

    if (!contentType || !contentType.includes("text/html")) return null;

    const htmlText = await response.text();
    const parser   = new DOMParser();
    const doc      = parser.parseFromString(htmlText, "text/html");
    const refCatastralElement = doc.querySelector("p a");

    if (!refCatastralElement) return null;

    return {
      referenciaCatastral: refCatastralElement.textContent.trim(),
      link: refCatastralElement.href
    };

  } catch {
    return null;
  }
};