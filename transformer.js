const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

// Transformer object with all important features
let transformer = {
  id: process.env.TRANSFORMER_ID || "T1",
  capacity: 100,
  load: 0,
  voltage: 230,
  current: 0,
  temperature: 25,
  time_since_maintenance: 0, // Hours, initialized to 0
  moisture_level: 0,         // Percentage
  lightning_surge: 0,        // Boolean (0 or 1)
  status: "Failure Not Present",
};

// API to get transformer data
app.get("/api/transformer", (req, res) => {
  res.status(200).json(transformer);
});

// API to manually update transformer data
app.post("/api/transformer/update", async (req, res) => {
  const { load, voltage, current, temperature, time_since_maintenance, moisture_level, lightning_surge } = req.body;
  transformer.load = load || transformer.load;
  transformer.voltage = voltage || transformer.voltage;
  transformer.current = current || transformer.current;
  transformer.temperature = temperature || transformer.temperature;
  transformer.time_since_maintenance = time_since_maintenance || transformer.time_since_maintenance;
  transformer.moisture_level = moisture_level || transformer.moisture_level;
  transformer.lightning_surge = lightning_surge || transformer.lightning_surge;

  transformer.status = await predictStatus();
  console.log(`Updated Transformer Status: ${transformer.status}`);
  res.status(200).json(transformer);
});

// Function to predict status using Flask API
async function predictStatus() {
  try {
    const response = await axios.post("http://localhost:10000/predict", {
      load: transformer.load,
      voltage: transformer.voltage,
      current: transformer.current,
      temperature: transformer.temperature,
      time_since_maintenance: transformer.time_since_maintenance,
      moisture_level: transformer.moisture_level,
      lightning_surge: transformer.lightning_surge
    });
    console.log(`Prediction Response: ${response.data.status}`);
    return response.data.status;
  } catch (error) {
    console.error("Error predicting status:", error.message);
    return transformer.load >= transformer.capacity * 0.8 ? "Failure Present" : "Failure Not Present";
  }
}

// Function to simulate real-time changes (every 3 seconds)
function simulateTransformerValues() {
  transformer.load = Math.min(Math.max(0, transformer.load + (Math.random() * 20 - 10)), transformer.capacity);
  transformer.voltage = Math.min(Math.max(220, transformer.voltage + (Math.random() * 5 - 2.5)), 240);
  transformer.current = Math.min(Math.max(0, transformer.current + (Math.random() * 2 - 1)), 15);
  transformer.temperature = Math.min(Math.max(15, transformer.temperature + (Math.random() * 5 - 2.5)), 45);
  transformer.time_since_maintenance += 3 / 3600;
  transformer.moisture_level = Math.min(Math.max(0, transformer.moisture_level + (Math.random() * 5 - 2.5)), 100);
  transformer.lightning_surge = Math.random() < 0.05 ? 1 : 0;

  predictStatus().then((status) => {
    transformer.status = status;
    console.log(`Simulated Transformer Status: ${transformer.status}`);
  });
}

// Automatically update values every 3 seconds
setInterval(simulateTransformerValues, 3000);

// Start the transformer server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Transformer ${transformer.id} running on port ${PORT}`);
});
