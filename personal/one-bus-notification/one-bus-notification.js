/**
 * Example API Call:
 * Note: JSON should be flat, indented and spaced for readability
 *
 * GET: /one-bus-notification/one-bus-notification.html
 *      ?apiKey=<key>&coordinates=<latitude>,<longitude>
 *      &trips={
 *          "<name-1>":{
 *              "routeIds":["<routeId-filter-1>","<routeId-filter-2>"],
 *              "id":"<stop-id-provided-by-OneBusAway>",
 *              "latitude":"<stop-latitude>","longitude":"<stop-longitude>"
 *          },
 *          "<name-2>":{
 *              "routeIds":["<routeId-filter-1>","<routeId-filter-2>"],
 *              "id":"<stop-id-provided-by-OneBusAway>",
 *              "latitude":"<stop-latitude>","longitude":"<stop-longitude>"
 *           }
 *      }
 * Returns: [ "name-1": Route <routeId> arrives in 3 minutes", ... ]
 *
 * Usage: User will provide an API key from OneBusAway, along with current latitude and longitude, to get an ordered
 * list of user-friendly messages of when the next bus will arrive. User will also provide a list of JSON "trips"
 * used to find the nearest bus stop, along with the route filters (see GET Method example).
 *
 * Note: Original creator is planning to use Apple Shortcuts, along with an Action button, with a bunch of automations
 * supported in iOS, as the primary use-case.
 */

class Trip {
    constructor(id, name, latitude, longitude, routeIds) {
        this.id = id
        this.name = name
        this.latitude = parseFloat(latitude)
        this.longitude = parseFloat(longitude)
        this.routeIds = routeIds
    }
}

async function getUrlJson(url) {
    try {
        return await $.getJSON(url)
    } catch (error) {
        console.error("Error fetching data:", error)
        return null  // Return null or handle as needed
    }
}

function getMinutesDifference(ecoph) {
    const now = new Date()
    const ecophDate = new Date(ecoph)

    const differenceInMilliseconds = ecophDate - now
    return Math.floor(differenceInMilliseconds / 60000)
}

function getHtmlBullets(upcomingArrivals) {
    let html = ""
    upcomingArrivals.forEach((arrival, index) => {
        html += `<li>${arrival} minutes</li>`
    })
    return html
}

function getHtmlSection(routeName, upcomingArrivals) {
    return `
        <h2>Route ${routeName} Upcoming Arrivals</h2>
        <ul>
            ${getHtmlBullets(upcomingArrivals)}
        </ul>
    `
}

function getHtmlTrip(name, nextArrivals) {
    let sectionString = ""
    nextArrivals.keys().forEach(routeName => {
        const upcomingArrivals = nextArrivals.get(routeName)

        sectionString += getHtmlSection(routeName, upcomingArrivals) + "\n"
    })

    return `
        <h1>${name}</h1>
        ${sectionString}
    `
}

function displayData(name, nextArrivals) {
    if (nextArrivals === undefined) {
        $(document.body).append("No departures found!")
        return
    }
    $(document.body).append(getHtmlTrip(name, nextArrivals))
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    // Convert latitudes and longitudes from degrees to radians
    const R = 6371 // Earth radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180) // Convert degrees to radians
    const dLon = (lon2 - lon1) * (Math.PI / 180) // Convert degrees to radians

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in kilometers
}

function findNearestTrip(lat, lon, trips) {
    let nearest = null
    let shortestDistance = Infinity

    trips.forEach(trip => {
        const distance = calculateDistance(lat, lon, trip.latitude, trip.longitude)
        if (distance < shortestDistance) {
            shortestDistance = distance
            nearest = trip
        }
    })

    return nearest
}

function parseTrips(trips) {
    return Object.keys(trips).map(rawName => {
        const { id, latitude, longitude, routeIds } = trips[rawName]
        return new Trip(id, rawName, latitude, longitude, routeIds === undefined ? [] : routeIds)
    })
}

async function main() {
    const params = new URLSearchParams(window.location.search)

    // Get from param query
    const apiKey = params.get("apiKey")
    const coordinates = params.get("coordinates").split(',')
    const rawTrips = JSON.parse(params.get("trips"))
    const limit = params.get("limit")

    const latitude = coordinates[0]
    const longitude = coordinates[1]
    const trips = parseTrips(rawTrips)

    const closestTrip = findNearestTrip(latitude, longitude, trips)
    const arrivalUrl = `https://api.pugetsound.onebusaway.org/api/where/arrivals-and-departures-for-stop/${closestTrip.id}.json?key=${apiKey}&minutesBefore=0&minutesAfter=120`

    const arrivals = await getUrlJson(arrivalUrl)
    if (arrivals) {
        const nextArrivals = arrivals.data["entry"]["arrivalsAndDepartures"]
        const routeToExpectedArrival = new Map

        nextArrivals
            .filter(bus => closestTrip === [] || closestTrip.routeIds.includes(bus["routeShortName"]))
            .forEach(bus => {
                const expectedArrival = getMinutesDifference(bus["predictedArrivalTime"])
                if (expectedArrival >= 0) {
                    const routeName = bus["routeShortName"]
                    if (!routeToExpectedArrival.has(routeName)) {
                        routeToExpectedArrival.set(routeName, new Set([expectedArrival]))
                    } else {
                        routeToExpectedArrival.get(routeName).add(expectedArrival)
                    }
                }
            })
        displayData(closestTrip.name, routeToExpectedArrival)
    } else {
        displayData(undefined, undefined)
    }
}

// Run the main function when the page loads
window.onload = main
