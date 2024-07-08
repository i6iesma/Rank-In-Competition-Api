const express = require("express");
const app = express();
const axios = require("axios");
const axiosRateLimit = require("axios-rate-limit");
const axiosRetry = require("axios-retry").default;
const port = 3000;

// Create a rate-limited axios instance with an increased timeout
const http = axiosRateLimit(axios.create({
    timeout: 10000 // Increase timeout to 10 seconds
}), { maxRPS: 15 }); // limit to 5 requests per second

// Add retry functionality to the rate-limited axios instance
axiosRetry(http, { 
    retries: 3, // number of retries
    retryDelay: axiosRetry.exponentialDelay, // exponential backoff delay between retries
    retryCondition: (error) => axiosRetry.isNetworkOrIdempotentRequestError(error) // retry on network errors or idempotent requests
});

app.get('/', async (req, res) => {
    const compId = req.query.compId;
    const eventId = req.query.eventId;
    let competitorsInComp = [];
    let competitorsData = [];
    let currentProg = 0
    try {
        // Get the list of competitors in the competition 
        let response = await http.get(`https://competitors-in-competition.vercel.app/${compId}`);
        competitorsInComp = response.data;
        console.log(competitorsInComp);

        const totalCompetitors = competitorsInComp.length;

        // Use Promise.all to fetch data for all competitors concurrently with rate limiting and retries
        const competitorPromises = competitorsInComp.map(async (id, index) => {
            try {
                const response = await http.get(`https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/persons/${id}.json`);
                const eventPb = getEventPbs(response.data.rank, eventId)[0]?.best; // Use optional chaining in case the event is not found
                console.log(`eventPb for competitor ${id}:`, eventPb);
                
                return {
                    "pb": eventPb,
                    "id": response.data.id
                };
            } catch (error) {
                console.error(`Error fetching data for competitor ${id} (index ${index + 1}):`, error);
                return null; // Return null if there's an error fetching data for a specific competitor
            }
        });

        competitorsData = await Promise.all(competitorPromises);
        competitorsData = competitorsData.filter(data => data !== null); // Filter out null values
        res.json(competitorsData);

    } catch (error) {
        console.error('Error fetching competitors data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

function getEventPbs(competitorData, eventId) {
    console.log(`getEventPbs called with competitorData:`, competitorData);
    console.log(`getEventPbs called with eventId:`, eventId);
    
    if (!competitorData || !competitorData.singles) {
        console.error(`Invalid competitorData:`, competitorData);
        return [];
    }
    
    const filteredData = competitorData.singles.filter(event => event.eventId === eventId);
    console.log(`Filtered data:`, filteredData);
    return filteredData;
}

app.post('/post-test', (req, res) => {
    const bodyContent = req.body.name;
    res.send({
        message: bodyContent
    });
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
