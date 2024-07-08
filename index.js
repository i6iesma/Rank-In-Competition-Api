const express = require("express");
const app = express();
const axios = require("axios");
const axiosRateLimit = require("axios-rate-limit");
const axiosRetry = require("axios-retry").default;
const port = 3000;

// Create a rate-limited axios instance with an increased timeout
const http = axiosRateLimit(
  axios.create({
    timeout: 20000, // Increase timeout to 10 seconds
  }),
  { maxRPS: 5 }
); // limit to 5 requests per second

// Add retry functionality to the rate-limited axios instance
axiosRetry(http, {
  retries: 3, // number of retries
  retryDelay: axiosRetry.exponentialDelay, // exponential backoff delay between retries
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error), // retry on network errors or idempotent requests
});

app.get("/", async (req, res) => {
  const compId = req.query.compId;
  const eventId = req.query.eventId;
  const eventFormat = req.query.format;
  let competitorsInComp = [];
  let competitorsData = [];
  let currentProg = 0;
  try {
    // Get the list of competitors in the competition
    let response = await http.get(
      `https://competitors-in-competition.vercel.app/${compId}`
    );
    competitorsInComp = response.data;
    console.log(competitorsInComp);

    const totalCompetitors = competitorsInComp.length;

    // Use Promise.all to fetch data for all competitors concurrently with rate limiting and retries
    const competitorPromises = competitorsInComp.map(async (id, index) => {
      const response = await http.get(
        `https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/persons/${id}.json`
      );
      const eventPbSingle = getEventPbsSingles(response.data.rank, eventId)[0]
        ?.best; // Use optional chaining in case the event is not found
      const eventPbAvg = getEventPbsAvg(response.data.rank, eventId)[0]?.best; // Use optional chaining in case the event is not found

      return {
        single: eventPbSingle,
        avg: eventPbAvg,
        id: response.data.id,
      };
    });

    competitorsData = await Promise.all(competitorPromises);
    competitorsData = competitorsData.filter((data) => data !== null); // Filter out null values
    // let finalData = formatTimes(sortCompetitorsData(competitorsData));
    let finalData = formatDecimals(
      formatTimes(sortCompetitorsData(competitorsData, eventFormat))
    );
    console.log("Finished!");
    res.json(finalData);
  } catch (error) {
    handleErr(error, res);
  }
});
function formatTimes(competitorsData) {
  return competitorsData.map((user) => ({
    id: user.id,
    single: user.single / 100,
    avg: user.avg / 100,
  }));
}
function sortCompetitorsData(competitorsData, eventFormat) {
  pb = eventFormat; // Either single or avg, dictated by the object design of competitorsData
  if (eventFormat === "single") {
    competitorsData.sort((a, b) => {
      if (a.single < b.single) {
        return -1;
      }
      if (a.single > b.single) {
        return 1;
      }
      if (a.single === b.single) {
        return 0;
      }
    });
  }
  if (eventFormat === "avg") {
    competitorsData.sort((a, b) => {
      if (a.avg < b.avg) {
        return -1;
      }
      if (a.avg > b.avg) {
        return 1;
      }
      if (a.avg === b.avg) {
        return 0;
      }
    });
  }
  return competitorsData;
}
function formatDecimals(data) {
  return data.map((item) => {
    item.single = item.single.toFixed(2);
    item.avg = item.avg.toFixed(2);
    return item;
  });
}

function getEventPbsSingles(competitorData, eventId) {
  console.log(`getEventPbs called with competitorData:`, competitorData);
  console.log(`getEventPbs called with eventId:`, eventId);

  if (!competitorData || !competitorData.singles) {
    console.error(`Invalid competitorData:`, competitorData);
    return [];
  }

  const filteredData = competitorData.singles.filter(
    (event) => event.eventId === eventId
  );
  console.log(`Filtered data:`, filteredData);
  return filteredData;
}
function getEventPbsAvg(competitorData, eventId) {
  console.log(`getEventPbs called with competitorData:`, competitorData);
  console.log(`getEventPbs called with eventId:`, eventId);

  if (!competitorData || !competitorData.averages) {
    console.error(`Invalid competitorData:`, competitorData);
    return [];
  }

  const filteredData = competitorData.averages.filter(
    (event) => event.eventId === eventId
  );
  console.log(`Filtered data:`, filteredData);
  return filteredData;
}
function handleErr(error, res) {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      console.error(
        "Error fetching competitors data, timeout exceded. Consider increasing the timeout time"
      );
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      console.error("Axios Error (not timeout)", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    console.error("Error fetching competitors data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
app.post("/post-test", (req, res) => {
  const bodyContent = req.body.name;
  res.send({
    message: bodyContent,
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
