const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log("No API Key found in .env.local");
        return;
    }

    console.log("Fetching list of models via REST API...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Supported Models for generateContent:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(m.name);
                }
            });
        } else {
            console.log("No models found in response:", JSON.stringify(data));
        }
    } catch (error) {
        console.log("Error listing models:", error.message);
    }
}

listModels();
