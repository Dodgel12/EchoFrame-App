# EchoFrame - Documento di Creazione App

## 1. Obiettivo del progetto
EchoFrame e una mobile app geolocalizzata in cui ogni foto (echo) viene associata a coordinate GPS reali e resa scopribile da altri utenti nelle vicinanze.

Obiettivi principali:
- acquisizione foto solo da camera interna;
- associazione posizione + timestamp a ogni echo;
- scoperta di contenuti su mappa in base alla prossimita;
- autenticazione utente e persistenza cloud tramite Supabase.

## 2. Stack tecnico usato
Frontend mobile:
- React Native
- Expo SDK 54
- TypeScript
- Expo Router (navigazione file-based)
- react-native-maps

Servizi Expo:
- expo-camera
- expo-location
- expo-notifications
- expo-file-system

Backend:
- Supabase Auth
- Supabase Postgres (con funzioni SQL RPC)
- Supabase Storage (bucket `echoes`)

## 3. Struttura del codice
Struttura principale:
- `app/_layout.tsx`: gate di autenticazione e routing root.
- `app/(auth)/*`: flussi di login/signup.
- `app/(app)/*`: area autenticata (mappa, camera, profilo, settings, dettaglio echo).
- `lib/auth-context.tsx`: sessione, utente, metodi auth.
- `lib/echo-service.ts`: upload foto, query echo vicini, rating, delete.
- `lib/location-service.ts`: permessi e utility geografiche (Haversine).
- `lib/discovery-service.ts`: polling e notifiche di scoperta.
- `supabase/migrations/*`: evoluzione schema DB e policy RLS.

## 4. Come e stata costruita l'app (workflow)
### Fase 1 - Setup progetto
1. Inizializzazione progetto Expo con TypeScript.
2. Configurazione Expo Router come entrypoint.
3. Setup dipendenze core (maps, camera, location, notifications, Supabase client).

### Fase 2 - Fondamenta backend
1. Configurazione progetto Supabase.
2. Definizione schema principale (`echoes`, `ratings`, `users`) tramite migration SQL.
3. Creazione funzione RPC per ricerca echo geograficamente vicini.
4. Aggiunta policy RLS per lettura/scrittura sicura.

### Fase 3 - Autenticazione
1. `AuthProvider` globale in root layout.
2. Gestione sessione all'avvio con `supabase.auth.getSession()`.
3. Flussi `signUp`, `signIn`, `signOut` centralizzati.
4. Redirect automatico tra area `(auth)` e area `(app)`.

### Fase 4 - Core feature Echo
1. Camera interna con permessi espliciti (`camera` + `location`).
2. Acquisizione foto e coordinate al momento dello scatto.
3. Upload immagine su Supabase Storage.
4. Inserimento record echo nel database con metadata geografici.

### Fase 5 - Mappa e discovery
1. Tracking posizione utente in tempo quasi reale.
2. Visualizzazione marker utente e raggi di prossimita.
3. Query periodica degli echo vicini.
4. Apertura dettaglio echo da marker.
5. Polling in background leggero per notifiche di nuovi echo non ancora scoperti.

## 5. Flusso dati end-to-end
1. Utente autenticato apre schermata camera.
2. App verifica permessi e ottiene posizione corrente.
3. Foto caricata nello storage bucket `echoes`.
4. URL pubblico immagine salvato in tabella `echoes`.
5. Schermata mappa interroga RPC `get_nearby_echoes` con lat/lon e raggio.
6. Echo mostrati su mappa e notificati quando entrano nel raggio di discovery.

## 6. Decisioni implementative importanti
- Solo camera interna: evita upload da galleria e aumenta autenticita del contenuto.
- Geosearch via RPC Postgres: piu performante e consistente rispetto a filtri client-side.
- Fallback query in `echo-service`: l'app resta operativa anche se la RPC non e disponibile.
- Polling con deduplica locale (`AsyncStorage`): evita notifiche duplicate sugli stessi echo.
- RLS + funzioni dedicate: sicurezza applicativa lato database.

## 7. Setup locale rapido
Prerequisiti:
- Node.js LTS
- npm
- Expo CLI (via `npx expo`)
- account Supabase

Passi:
1. entra in `EchoFrame`
2. installa dipendenze: `npm install`
3. configura variabili ambiente Supabase (URL e anon key)
4. avvia app: `npm run start`
5. esegui su emulatore/dispositivo con Expo Go o build dev

## 8. Stato attuale e prossimi step consigliati
Stato:
- autenticazione, capture/upload echo, mappa, discovery e notifiche base sono presenti.

Prossimi miglioramenti suggeriti:
- test automatici su servizi (`echo-service`, `location-service`);
- reverse geocoding per mostrare nomi luogo invece di coordinate raw;
- ottimizzazione polling con task in background avanzati;
- moderazione contenuti e report utenti;
- pipeline CI con lint + typecheck + test.
