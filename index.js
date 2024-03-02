import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import GeoTIFF from 'geotiff';

dotenv.config();

const app = express();

app.use(bodyParser.json({limit: "50mb", extended: true}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true}));
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Hello API My Friend');
});

const PORT = process.env.PORT || 3000;
const apiKey = process.env.GOOGLE_MAPS_API_KEY;

app.get('/api/aerialview', async (req, res) => {
  try {
    const parameterValue = '1600 Amphitheatre Parkway, Mountain View, CA 94043';
    const parameterKey = videoIdOrAddress(parameterValue);
    const urlParams = new URLSearchParams();
    urlParams.set(parameterKey, parameterValue);
    urlParams.set('key', apiKey);

    const response = await fetch(`https://aerialview.googleapis.com/v1/videos:lookupVideo?${urlParams.toString()}`);
    const videoResult = await response.json();

    if (videoResult.state === 'PROCESSING') {
      res.status(200).json({ message: 'Video still processing..' });
    } else if (videoResult.error && videoResult.error.code === 404) {
      res.status(404).json({ message: 'Video not found.' });
    } else {
      res.status(200).json({ videoUri: videoResult.uris?.MP4_MEDIUM.landscapeUri });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function videoIdOrAddress(value) {
  const videoIdRegex = /[0-9a-zA-Z-_]{22}/;
  return value.match(videoIdRegex) ? 'videoId' : 'address';
}

app.get('/api/solarInfo', async (req, res) => {
  
  try {
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;
    console.log('Latitude:', latitude);
    console.log('Longitude:', longitude);
    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${latitude}&location.longitude=${longitude}&requiredQuality=HIGH&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    console.error('API request failed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/geo_data', async (req, res) => {
  
  try {
    const fetchData = async (url) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
    
        // Parse the GeoTIFF data
        const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();
        const raster = await image.readRasters();
    
        // Do something with the raster data (e.g., save it, process it, etc.)
        console.log('Raster data:', raster);
      } catch (error) {
        console.error('Error fetching GeoTIFF data:', error);
      }
    };

    const annualFluxUrl = "https://solar.googleapis.com/v1/geoTiff:get?id=41cf3b82630cb847b2357e159f65af63-8de5bd0f953b0830cd4281c8228dcbfb";
    const dsmUrl = "https://solar.googleapis.com/v1/geoTiff:get?id=df19d06bd648bbf11965b778bff5901e-1521b31d7c11feb51ca57f232e27d9cd";
    fetchData(annualFluxUrl);
    fetchData(dsmUrl);

  } catch (error) {
    console.error('GEO API request failed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`server starts with PORT ${process.env.PORT}`);
})