const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Predefined List of Transformers (ID, URL, and Location)
const transformers = {
  "T1": { 
    url: "http://localhost:5001/api/transformer", 
    data: {}, 
    location: { lat: 19.0760, lon: 72.8777 } // Example: Mumbai
  },
  "T2": { 
    url: "http://localhost:5002/api/transformer", 
    data: {}, 
    location: { lat: 28.7041, lon: 77.1025 } // Example: Delhi
  },
  "T3": { 
    url: "http://localhost:5003/api/transformer", 
    data: {}, 
    location: { lat: 13.0827, lon: 80.2707 } // Example: Chennai
  }
};

// Function to fetch and display transformer details
async function displayTransformerDetails() {
  for (const id in transformers) {
    try {
      const response = await axios.get(transformers[id].url);
      transformers[id].data = response.data;
      console.log(`Transformer ${id} at (${transformers[id].location.lat}, ${transformers[id].location.lon})`);
      console.log(`Status: ${response.data.status}`);
      console.log("----------------------");
    } catch (err) {
      console.log(`Transformer ${id} is not reachable.`);
    }
  }
}

// Automatically display details every 5 seconds
setInterval(displayTransformerDetails, 5000);

// Start the Central Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Central Server running on port ${PORT}`);
  displayTransformerDetails();
});
