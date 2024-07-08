const express = require("express")
const app = express()
const axios = require("axios")
const port = 3000

app.get('/', async (req, res) => {
    const compId = req.query.compId
    const eventId = req.query.eventId
    const competitorId = req.query.competitorId
    let competitorsInComp = []
    competitorsData = []
    // Get the list of competitors in the competition 
    let response = await axios.get(`https://competitors-in-competition.vercel.app/${compId}`)
    competitorsInComp = response.data
    console.log(competitorsInComp)
    // competitorsInComp.foreach((id) => competirsIn)
    for (let i = 0; i < competitorsInComp.length; i++) {
        console.log(competitorsInComp[i])
        response = await axios.get(`https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/persons/${competitorsInComp[i]}.json`)
        eventPb = getEventPbs(response.data.rank, eventId)[0].best
        console.log(eventPb)
        competitorsData.push({
            "pb": eventPb, 
            "id": response.data.id

        })
    }
    res.json(competitorsData)
})
function getEventPbs(competitorData, eventId) {
    const filteredData = competitorData.singles.filter(event => event.eventId === eventId);    
    return filteredData

} 
app.post('/post-test', (req, res) => {
    const bodyContent = req.body.name;
    res.send({
        message: bodyContent})
})
app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})