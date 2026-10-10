import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.PLANTNET_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Plant identification is not configured on the server.'
    });
  }

  try {
    const imageDataUrl = req.body?.imageDataUrl;

    if (typeof imageDataUrl !== 'string') {
      return res.status(400).json({ error: 'An image is required.' });
    }

    const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(
      imageDataUrl
    );

    if (!match) {
      return res.status(400).json({
        error: 'Please upload a JPEG or PNG image.'
      });
    }

    const mimeType = match[1];
    const base64 = match[2];
    const imageBytes = Buffer.from(base64, 'base64');

    if (
      imageBytes.length === 0 ||
      imageBytes.length > 3 * 1024 * 1024
    ) {
      return res.status(413).json({
        error: 'Image is empty or too large. Please use a smaller photo.'
      });
    }

    const form = new FormData();

    form.append(
      'images',
      new Blob([Uint8Array.from(imageBytes)], { type: mimeType }),
      mimeType === 'image/png' ? 'plant.png' : 'plant.jpg'
    );

    form.append('organs', 'auto');

    const url = new URL(
      'https://my-api.plantnet.org/v2/identify/all'
    );

    url.searchParams.set('api-key', apiKey);
    url.searchParams.set('lang', 'en');
    url.searchParams.set('nb-results', '5');

    const upstream = await fetch(url.toString(), {
      method: 'POST',
      body: form
    });

    if (!upstream.ok) {
      const upstreamError = await upstream.text();

      console.error('Pl@ntNet plant identification failure:', {
        status: upstream.status,
        response: upstreamError.slice(0, 1000),
      });

      return res.status(
        upstream.status === 429 ? 429 : 502
      ).json({
        error: upstream.status === 429
          ? 'The plant identification service is busy or its request limit was reached.'
          : 'The plant identification service could not identify this photo.'
      });
    }

    const data = await upstream.json();

    const results = Array.isArray(data.results)
      ? data.results.map((item: any) => ({
          scientificName: item.species?.scientificName ?? null,
          commonNames: Array.isArray(item.species?.commonNames)
            ? item.species.commonNames
            : [],
          score: typeof item.score === 'number'
            ? item.score
            : null
        }))
      : [];

    return res.status(200).json({
      results,
      bestMatch: data.bestMatch ?? null,
      predictedOrgans: data.predictedOrgans ?? [],
      version: data.version ?? null,
      remainingIdentificationRequests:
        data.remainingIdentificationRequests ?? null
    });
  } catch (error) {
    console.error('Plant identification API error:', error);

    return res.status(500).json({
      error: 'Something went wrong while identifying the plant.'
    });
  }
}
