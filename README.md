ECHOFRAMES Location-based photo echoes EchoFrames is a social discovery app where photos are tied to exact GPS locations. 
Capture a moment, attach it to where you are, and let others discover it when they visit the same place. No followers, no feeds—just a map of shared memories. 

──────────────────────────────────────── 

Concept EchoFrames introduces geo-anchored media. Every photo is taken inside the app and permanently linked to its GPS coordinates. 
When another user later approaches that spot, they may receive a notification like: 
Echo Found Nearby Someone left a memory here. Opening the notification reveals the photo, its timestamp, 
and a discussion thread. Over time, locations accumulate echoes—a social layer built on top of physical spaces.

──────────────────────────────────────── 
Core Features Geo-Anchored Photos Photos are tied to real-world coordinates. 
To preserve authenticity: Must be taken with the in-app camera (no gallery uploads). 
Automatic timestamp overlay. GPS coordinates embedded with each echo. 
Map-First Interface The main view is an interactive map. 
See your location, nearby echoes, and hotspots with high activity. 
Places with highly rated echoes use a distinctive Echo marker.
Echo Discovery When you enter an area containing an echo, 
the app detects proximity. A push notification may be triggered. 
Discovery factors: distance, privacy settings,
and the echo’s ranking. Privacy Controls Choose who can see your echoes:
Visibility Description Public Anyone near the location can discover it. 
Private Circle Only selected users can view it. Echo Rating System Users can give a positive or negative rating. 
Ratings feed into a ranking algorithm that balances: Rating score Recency Randomised discovery (to prevent old echoes from dominating) 
Comments Each echo has a comment thread for discussions about the photo or place. 
Direct Messaging Private chat between users who discover each other’s echoes or share locations.

──────────────────────────────────────── 
Technology Stack EchoFrames is built with a modern mobile stack focused on rapid development and scalability. 
Mobile Application React Native Expo TypeScript Expo APIs used: Expo Camera Expo Location Expo Notifications Backend Platform EchoFrames uses Supabase as its backend infrastructure.
Supabase provides: PostgreSQL database authentication storage real-time subscriptions serverless edge functions Infrastructure Components Core backend services include: 
PostgreSQL with PostGIS for geolocation queries Supabase Storage for photo hosting Supabase Auth for user accounts Supabase Realtime for messaging and live updates Supabase Edge Functions for backend logic 


────────────────────────────────────── 

Development Status Current stage: Early development / prototype.
