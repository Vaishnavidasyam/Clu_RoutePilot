# Assumptions & Engineering Trade-Offs

## Challenge Requirements vs Application Assumptions

### Challenge Requirements (Strictly Adhered)
1. **Distance Model**: Haversine distance multiplied by 1.3 road correction factor.
2. **Travel Speed**: Fixed average speed of 25 km/h for urban transit.
3. **Objective**: Score = $\sum \text{Priority} - 2 \times \text{Total KM}$.
4. **Waiting Time**: Allowed if executive arrives before customer window opens. Waiting counts toward working duration, but not distance.
5. **Shift Constraints**: Every route must start and end at executive home depot, returning before shift end.

### Application Assumptions (Clearly Documented)
1. **Road Network Approximation**: The current model uses the challenge's Haversine $\times 1.3$ approximation. Real-world commercial deployment can plug in OSRM, Mapbox, or Google Maps Directions API without altering the core optimizer interfaces.
2. **GPS Tracking**: Real-time GPS pings are not faked. Field executives view static turn-by-turn lists and launch external navigation (Google Maps) directly from their portal.
3. **PTP Precedence**: When customer schedules conflict, PTP accounts take precedence over standard visits regardless of marginal distance.
