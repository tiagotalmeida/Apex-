import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Edit an image using Gemini 2.5 Flash Image ("Nano banana powered").
 */
export const editImageWithGemini = async (
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<{ text?: string; imageUrl?: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    let resultText = '';
    let resultImageUrl = '';

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          resultImageUrl = `data:image/png;base64,${part.inlineData.data}`;
        } else if (part.text) {
          resultText += part.text;
        }
      }
    }

    return { text: resultText, imageUrl: resultImageUrl };
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

/**
 * Find nearby places using Gemini 2.5 Flash with Google Maps Grounding.
 */
export const findNearbyPlaces = async (
  query: string,
  latitude: number,
  longitude: number
): Promise<{ text: string; chunks: any[] }> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: latitude,
              longitude: longitude
            }
          }
        }
      },
    });

    const text = response.text || "No information found.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, chunks };
  } catch (error) {
    console.error("Error searching maps:", error);
    throw error;
  }
};