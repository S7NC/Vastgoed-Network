import type nl from "./nl";

const de = {
  "The backup is an unencrypted text file. Keep it offline and never share it.":
    "Die Sicherung ist eine unverschlüsselte Textdatei. Bewahren Sie sie offline auf und geben Sie sie niemals weiter.",
  "Public key copied.": "Öffentlicher Schlüssel kopiert.",
  "Listing preview": "Inseratsvorschau",
  "Preview listing": "Inseratsvorschau öffnen",
  "Close preview": "Vorschau schließen",
  "Back to editor": "Zurück zum Editor",
  "Unpublished preview": "Unveröffentlichte Vorschau",
  "This preview is only visible in this browser. Nothing has been signed or published.":
    "Diese Vorschau ist nur in diesem Browser sichtbar. Es wurde nichts signiert oder veröffentlicht.",
  "Review the listing fields before opening the preview.":
    "Prüfen Sie die Inseratsfelder, bevor Sie die Vorschau öffnen.",
  "Close photos": "Fotos schließen",
  "No description supplied.": "Keine Beschreibung vorhanden.",
  "Listing source & authenticity": "Inseratsquelle und Echtheit",
  "Listing identifier": "Inseratskennung",
  "Publisher public key": "Öffentlicher Schlüssel des Anbieters",
  "Event ID": "Event-ID",
  "Nostr publisher": "Nostr-Anbieter",
  "Visit website": "Website besuchen",
  Newsletter: "Newsletter",
  "Property stories, ideas for your next move and what is new at Vastgoed, delivered by email.":
    "Immobiliengeschichten, Ideen für Ihren nächsten Schritt und Neuigkeiten von Vastgoed per E-Mail.",
  "By signing up, you agree to receive emails from Vastgoed. Unsubscribe at any time using the link in each email.":
    "Mit Ihrer Anmeldung stimmen Sie dem Erhalt von E-Mails von Vastgoed zu. Sie können sich jederzeit über den Link in jeder E-Mail abmelden.",
  "Zoom in": "Vergrößern",
  "Zoom out": "Verkleinern",
  "Reset bearing to north": "Karte nach Norden ausrichten",
  "Enter fullscreen": "Vollbild öffnen",
  "Exit fullscreen": "Vollbild schließen",
  "Toggle attribution": "Quellenangaben ein- oder ausblenden",
  "Map attribution": "Kartenquellenangaben",
  "Find my location": "Meinen Standort finden",
  searching: "Suche läuft",
  "request failed": "Anfrage fehlgeschlagen",
  "{count} listing events returned": "{count} Inserats-Events empfangen",
  "{count} events returned": "{count} Events empfangen",
  "{count} bed": "{count} Schlafzimmer",
  "{count} beds": "{count} Schlafzimmer",
  "{count} bath": "{count} Badezimmer",
  "{count} baths": "{count} Badezimmer",
  "{count} m²": "{count} m²",
  "Empty responses can indicate no matches, access restrictions, or timeouts; they do not establish complete coverage.":
    "Leere Antworten können auf fehlende Treffer, Zugriffsbeschränkungen oder Zeitüberschreitungen hinweisen; sie belegen keine vollständige Abdeckung.",
  "On request": "Auf Anfrage",
  "Not supplied": "Nicht angegeben",
  "Floor area": "Grundfläche",
  Villa: "Villa",
  Studio: "Studio",
  Townhouse: "Reihenhaus",
  "Property navigation": "Immobiliennavigation",
  "Property photos": "Immobilienfotos",
  "Photo unavailable": "Foto nicht verfügbar",
  "This listing is not active and is not shown in active search results.":
    "Dieses Inserat ist nicht aktiv und wird nicht in aktiven Suchergebnissen angezeigt.",
  "This listing is {status} and is not shown in active search results.":
    "Dieses Inserat ist {status} und wird nicht in aktiven Suchergebnissen angezeigt.",
  "title is required": "Ein Titel ist erforderlich",
  "description is required": "Eine Beschreibung ist erforderlich",
  "location is required": "Ein Standort ist erforderlich",
  "currency is required": "Eine Währung ist erforderlich",
  "identifier is required": "Eine Kennung ist erforderlich",
  "publishedAt must be a non-negative integer":
    "Der Veröffentlichungszeitpunkt muss eine nicht negative ganze Zahl sein",
  "currency must be a three-letter code":
    "Die Währung muss ein Code aus drei Buchstaben sein",
  "country must be a two-letter ISO code":
    "Das Land muss ein ISO-Code aus zwei Buchstaben sein",
  "transaction must be sale or rent":
    "Die Transaktion muss Verkauf oder Vermietung sein",
  "status must be active, sold, rented, or withdrawn":
    "Der Status muss aktiv, verkauft, vermietet oder zurückgezogen sein",
  "latitude and longitude must both be provided":
    "Breiten- und Längengrad müssen beide angegeben werden",
  "images must use safe HTTPS URLs":
    "Bilder müssen sichere HTTPS-URLs verwenden",
  Language: "Sprache",
  "Current interface language": "Aktuelle Oberflächensprache",
  "Skip to content": "Zum Inhalt springen",
  "Vastgoed.net home": "Vastgoed.net Startseite",
  "Main navigation": "Hauptnavigation",
  "Footer navigation": "Fußzeilennavigation",
  "Property search": "Immobiliensuche",
  Guides: "Ratgeber",
  guides: "Ratgeber",
  Dashboard: "Übersicht",
  "Email list": "Newsletter",
  "Publish for free": "Kostenlos veröffentlichen",
  "Not connected": "Nicht verbunden",
  Connect: "Verbinden",
  "Connect Nostr": "Nostr verbinden",
  Disconnect: "Verbindung trennen",
  "Loading property search...": "Immobiliensuche wird geladen...",
  "Property, without borders": "Immobilien ohne Grenzen",
  "Find your next place.": "Finden Sie Ihr nächstes Zuhause.",
  "active listings loaded": "aktive Inserate geladen",
  "City, region or keywords": "Stadt, Region oder Suchbegriffe",
  "Where would you like to live?": "Wo möchten Sie wohnen?",
  "Looking to": "Ich möchte",
  "Buy or rent": "Kaufen oder mieten",
  Buy: "Kaufen",
  Rent: "Mieten",
  "Property type": "Immobilienart",
  "All property types": "Alle Immobilienarten",
  Apartment: "Wohnung",
  House: "Haus",
  Land: "Grundstück",
  Commercial: "Gewerbeimmobilie",
  Other: "Sonstige",
  "Apply filters": "Filter anwenden",
  "More filters": "Weitere Filter",
  Reset: "Zurücksetzen",
  "An open property network. No login to explore.":
    "Ein offenes Immobiliennetzwerk. Ohne Anmeldung entdecken.",
  "Country code": "Ländercode",
  Currency: "Währung",
  "Minimum price": "Mindestpreis",
  "Maximum price": "Höchstpreis",
  "Minimum bedrooms": "Mindestanzahl Schlafzimmer",
  "Price period": "Preiszeitraum",
  "Any period": "Alle Zeiträume",
  "One-time price": "Einmaliger Preis",
  "Per month": "Pro Monat",
  "Per week": "Pro Woche",
  "Per year": "Pro Jahr",
  "Per day": "Pro Tag",
  "properties to explore": "Immobilien zum Entdecken",
  Sort: "Sortieren",
  "Newest first": "Neueste zuerst",
  "Oldest first": "Älteste zuerst",
  "Search layout": "Suchansicht",
  List: "Liste",
  Split: "Geteilt",
  Map: "Karte",
  "Property results": "Immobilienergebnisse",
  "Property map": "Immobilienkarte",
  "Search this map area": "In diesem Kartenausschnitt suchen",
  "Clear area": "Gebiet zurücksetzen",
  "properties on the map": "Immobilien auf der Karte",
  "Locations may be approximate": "Standorte können ungenau sein",
  "Load more from relays": "Weitere von Relays laden",
  "Refresh latest": "Neueste abrufen",
  "Showing listings retrieved from connected relays, not a complete market index. A signature does not verify property ownership. Verify properties and publishers independently.":
    "Angezeigt werden Inserate von verbundenen Relays, kein vollständiger Marktüberblick. Eine Signatur bestätigt kein Immobilieneigentum. Prüfen Sie Immobilien und Anbieter unabhängig.",
  "Network coverage & relay settings":
    "Netzwerkabdeckung und Relay-Einstellungen",
  "Discovery relays (maximum 8)": "Relays für die Suche (maximal 8)",
  "Save and reload": "Speichern und neu laden",
  "Wait for the current relay discovery to finish before changing sources.":
    "Warten Sie, bis die aktuelle Relay-Suche abgeschlossen ist, bevor Sie die Quellen ändern.",
  "Map tiles could not be loaded. Property results are still available.":
    "Die Kartenkacheln konnten nicht geladen werden. Immobilienergebnisse sind weiterhin verfügbar.",
  "Map tiles could not be loaded. Property details are still available.":
    "Die Kartenkacheln konnten nicht geladen werden. Immobiliendetails sind weiterhin verfügbar.",
  "The map needs WebGL. Listing search is still available.":
    "Die Karte benötigt WebGL. Die Inseratsuche ist weiterhin verfügbar.",
  "Choose a currency in More filters before applying a price range. Different currencies cannot be compared directly.":
    "Wählen Sie unter Weitere Filter eine Währung, bevor Sie eine Preisspanne anwenden. Verschiedene Währungen sind nicht direkt vergleichbar.",
  "Minimum price must not be higher than maximum price.":
    "Der Mindestpreis darf nicht höher als der Höchstpreis sein.",
  "Choose a price period in More filters, or select Buy for one-time prices. Weekly and monthly rents cannot be compared directly.":
    "Wählen Sie unter Weitere Filter einen Preiszeitraum oder Kaufen für einmalige Preise. Wochen- und Monatsmieten sind nicht direkt vergleichbar.",
  "An open door to something new": "Eine offene Tür zu etwas Neuem",
  "Exploring the property network...": "Immobiliennetzwerk wird durchsucht...",
  "Your next place is out there.": "Ihr nächstes Zuhause wartet auf Sie.",
  "Searching connected relays for property listings. Results will appear as they arrive.":
    "Verbundene Relays werden nach Immobilieninseraten durchsucht. Ergebnisse erscheinen, sobald sie eintreffen.",
  "No matching properties loaded yet. Try a broader search or load more from the network.":
    "Noch keine passenden Immobilien geladen. Erweitern Sie die Suche oder laden Sie weitere Inserate aus dem Netzwerk.",
  "Have a place to share? Publish for free":
    "Eine Immobilie anzubieten? Kostenlos veröffentlichen",
  "Your property. Your identity. No listing fee from Vastgoed.":
    "Ihre Immobilie. Ihre Identität. Keine Inseratsgebühr von Vastgoed.",
  "Get a fresh perspective. Join the email list":
    "Neue Perspektiven. Newsletter abonnieren",
  "Loading…": "Wird geladen…",
  "Map area applied": "Kartenausschnitt angewendet",
  "{count} matching properties / {total} active properties loaded":
    "{count} passende Immobilien / {total} aktive Immobilien geladen",
  "{count} listing loaded": "{count} Inserat geladen",
  "{count} listings loaded": "{count} Inserate geladen",
  "{count} listing in this view": "{count} Inserat in dieser Ansicht",
  "{count} listings in this view": "{count} Inserate in dieser Ansicht",
  "{count} properties to explore": "{count} Immobilien zum Entdecken",
  "{count} active listings loaded": "{count} aktive Inserate geladen",
  "{count} properties on the map": "{count} Immobilien auf der Karte",
  "No photograph supplied": "Kein Foto vorhanden",
  "Photograph unavailable": "Foto nicht verfügbar",
  "For rent": "Zu vermieten",
  "For sale": "Zu verkaufen",
  Property: "Immobilie",
  "Location not supplied": "Kein Standort angegeben",
  "Published on Nostr": "Auf Nostr veröffentlicht",
  "Something went wrong.": "Ein Fehler ist aufgetreten.",
  "Install a NIP-07 browser extension such as nos2x or Alby to manage listings. Browsing and email signup do not need an extension.":
    "Installieren Sie eine NIP-07-Browsererweiterung wie nos2x oder Alby, um Inserate zu verwalten. Für die Suche und Newsletter-Anmeldung ist keine Erweiterung nötig.",
  "The extension returned an invalid public key.":
    "Die Erweiterung hat einen ungültigen öffentlichen Schlüssel zurückgegeben.",
  "Wait for the current signing or publication request to finish.":
    "Warten Sie, bis die aktuelle Signatur- oder Veröffentlichungsanfrage abgeschlossen ist.",
  "Identity changed during signing. Reconnect and try again.":
    "Die Identität wurde beim Signieren geändert. Verbinden Sie sich erneut und versuchen Sie es noch einmal.",
  "Connect the identity that signed this event before retrying.":
    "Verbinden Sie vor einem erneuten Versuch die Identität, die dieses Event signiert hat.",
  "Partial success: retry to reach the remaining relays.":
    "Teilweise erfolgreich: Versuchen Sie es erneut, um die übrigen Relays zu erreichen.",
  "Discovering your profile and advertised relays…":
    "Profil und angegebene Relays werden gesucht…",
  "Searching your relays…": "Ihre Relays werden durchsucht…",
  "My Listings": "Meine Inserate",
  Profile: "Profil",
  Relays: "Relays",
  "Media & Storage": "Medien und Speicher",
  Email: "E-Mail",
  "New Listing": "Neues Inserat",
  "Edit Listing": "Inserat bearbeiten",
  "Your Nostr workspace": "Ihr Nostr-Arbeitsbereich",
  "Nostr account": "Nostr-Konto",
  "Open navigation": "Navigation öffnen",
  "Close navigation": "Navigation schließen",
  "Client sidebar": "Client-Seitenleiste",
  "Dashboard navigation": "Navigation der Übersicht",
  "Extension or public npub": "Erweiterung oder öffentliche npub",
  "Browse Properties": "Immobilien ansehen",
  "Switch account / Disconnect": "Konto wechseln / Verbindung trennen",
  "Connect an account": "Konto verbinden",
  "Loading account…": "Konto wird geladen…",
  "No private key required": "Kein privater Schlüssel erforderlich",
  "Vastgoed / Nostr client": "Vastgoed / Nostr-Client",
  "Refresh from relays": "Von Relays aktualisieren",
  "Loading your account from its relays. Editing becomes available when discovery finishes.":
    "Ihr Konto wird von seinen Relays geladen. Nach Abschluss der Suche können Sie es bearbeiten.",
  "Your property workspace": "Ihr Immobilienarbeitsbereich",
  "Open doors. Keep your keys.":
    "Öffnen Sie Türen. Behalten Sie Ihre Schlüssel.",
  "Connect a NIP-07 browser extension to manage your profile, properties and relays. We never ask for your private key.":
    "Verbinden Sie eine NIP-07-Browsererweiterung, um Ihr Profil, Ihre Immobilien und Relays zu verwalten. Wir fragen niemals nach Ihrem privaten Schlüssel.",
  "Prefer to stay informed?": "Möchten Sie lieber auf dem Laufenden bleiben?",
  "Your listings. Your identity.": "Ihre Inserate. Ihre Identität.",
  "Load existing listings with your public npub, or connect your browser extension. Signing is only needed to publish changes.":
    "Laden Sie vorhandene Inserate mit Ihrer öffentlichen npub oder verbinden Sie Ihre Browsererweiterung. Eine Signatur ist nur zum Veröffentlichen von Änderungen nötig.",
  "Your npub": "Ihre npub",
  "Load my listings": "Meine Inserate laden",
  "Never enter an nsec or private key.":
    "Geben Sie niemals eine nsec oder einen privaten Schlüssel ein.",
  "Enter a valid public npub. Never enter a private key.":
    "Geben Sie eine gültige öffentliche npub ein. Geben Sie niemals einen privaten Schlüssel ein.",
  "Enter a public npub, not an nsec or another Nostr identifier.":
    "Geben Sie eine öffentliche npub ein, keine nsec oder andere Nostr-Kennung.",
  "Make your next move.": "Machen Sie den nächsten Schritt.",
  "Listings and profiles are public. Exact coordinates and contact details will be visible to anyone. Local drafts stay on this browser and can be lost if its storage is cleared.":
    "Inserate und Profile sind öffentlich. Genaue Koordinaten und Kontaktdaten sind für alle sichtbar. Lokale Entwürfe bleiben in diesem Browser und können beim Löschen des Speichers verloren gehen.",
  "Your listings": "Ihre Inserate",
  "New listing": "Neues Inserat",
  "Unsupported listing": "Nicht unterstütztes Inserat",
  "Unknown status": "Unbekannter Status",
  Edit: "Bearbeiten",
  Delete: "Löschen",
  View: "Ansehen",
  "No listings loaded from these relays yet.":
    "Von diesen Relays wurden noch keine Inserate geladen.",
  "Edit property": "Immobilie bearbeiten",
  "List a property": "Immobilie inserieren",
  Title: "Titel",
  "Short summary": "Kurze Zusammenfassung",
  Location: "Standort",
  "City, region, country": "Stadt, Region, Land",
  Transaction: "Transaktion",
  "Price (blank = on request)": "Preis (leer = auf Anfrage)",
  "Currency code": "Währungscode",
  "Rental period": "Mietzeitraum",
  "One-time / not supplied": "Einmalig / nicht angegeben",
  Bedrooms: "Schlafzimmer",
  Bathrooms: "Badezimmer",
  "Area in m²": "Fläche in m²",
  "Latitude (optional)": "Breitengrad (optional)",
  "Longitude (optional)": "Längengrad (optional)",
  Availability: "Verfügbarkeit",
  Active: "Aktiv",
  Sold: "Verkauft",
  Rented: "Vermietet",
  Withdrawn: "Zurückgezogen",
  "Description / public contact details":
    "Beschreibung / öffentliche Kontaktdaten",
  "Image URLs (HTTPS, one per line)": "Bild-URLs (HTTPS, eine pro Zeile)",
  "Upload a photograph": "Foto hochladen",
  "Uploads are public. Images are resized and re-encoded to strip EXIF. Review photos for visible private information.":
    "Uploads sind öffentlich. Bilder werden verkleinert und neu kodiert, um EXIF-Daten zu entfernen. Prüfen Sie Fotos auf sichtbare private Informationen.",
  "Sign and publish": "Signieren und veröffentlichen",
  "Save local draft": "Lokalen Entwurf speichern",
  "Restore local draft": "Lokalen Entwurf wiederherstellen",
  "Your public profile": "Ihr öffentliches Profil",
  Name: "Name",
  "Display name": "Anzeigename",
  About: "Über mich",
  "Picture URL": "Bild-URL",
  Website: "Website",
  "Sign profile update": "Profilaktualisierung signieren",
  "Other profile fields are preserved. Changes affect your identity across Nostr clients.":
    "Andere Profilfelder bleiben erhalten. Änderungen gelten für Ihre Identität in allen Nostr-Clients.",
  "Relays and media": "Relays und Medien",
  "Session publishing / read relays":
    "Veröffentlichungs- und Lese-Relays dieser Sitzung",
  "Blossom upload server": "Blossom-Uploadserver",
  "Save browser settings": "Browsereinstellungen speichern",
  "Publish these as my NIP-65 relay list":
    "Diese als meine NIP-65-Relay-Liste veröffentlichen",
  "Publishing replaces your global relay list with these relays as read/write relays. It does not change the public discovery settings.":
    "Die Veröffentlichung ersetzt Ihre globale Relay-Liste durch diese Lese-/Schreib-Relays. Die öffentlichen Sucheinstellungen bleiben unverändert.",
  "Retry last signed event": "Letztes signiertes Event erneut senden",
  "Clear listing cache": "Inseratscache leeren",
  "Email membership": "E-Mail-Mitgliedschaft",
  "All listings": "Alle Inserate",
  "Listing status": "Inseratsstatus",
  "Sold / Rented / Withdrawn": "Verkauft / Vermietet / Zurückgezogen",
  "Resume local draft": "Lokalen Entwurf fortsetzen",
  "Loaded listings": "Geladene Inserate",
  Searching: "Suche läuft",
  Updated: "Aktualisiert",
  "Relay discovery": "Relay-Suche",
  "Searching your advertised relays for existing listings…":
    "Ihre angegebenen Relays werden nach vorhandenen Inseraten durchsucht…",
  "No NIP-99 listings were returned by these relays. Check Relays, add a missing relay, and refresh.":
    "Diese Relays haben keine NIP-99-Inserate zurückgegeben. Prüfen Sie die Relays, ergänzen Sie fehlende Relays und aktualisieren Sie die Ansicht.",
  "Published descriptions, contact details, images and coordinates are public. Local drafts stay on this device. Saving to Nostr requires a signature from the matching browser extension.":
    "Veröffentlichte Beschreibungen, Kontaktdaten, Bilder und Koordinaten sind öffentlich. Lokale Entwürfe bleiben auf diesem Gerät. Zum Speichern auf Nostr ist eine Signatur der passenden Browsererweiterung nötig.",
  "Images are uploaded directly from your browser to Blossom. Your own server can be set here later.":
    "Bilder werden direkt aus Ihrem Browser zu Blossom hochgeladen. Ihren eigenen Server können Sie hier später einstellen.",
  "Save media settings": "Medieneinstellungen speichern",
  "Upload property photographs from the listing editor. Files are public and are re-encoded to strip EXIF metadata.":
    "Laden Sie Immobilienfotos im Inseratseditor hoch. Dateien sind öffentlich und werden neu kodiert, um EXIF-Metadaten zu entfernen.",
  "Your advertised NIP-65 relays are used to find existing listings. Updates are sent to your write relays as well as the browser publishing settings.":
    "Ihre angegebenen NIP-65-Relays werden zum Finden vorhandener Inserate verwendet. Änderungen werden an Ihre Schreib-Relays und die im Browser eingestellten Veröffentlichungs-Relays gesendet.",
  Read: "Lesen",
  Write: "Schreiben",
  "Read / Write": "Lesen / Schreiben",
  "No advertised relay list found. Browser settings and default relays are used as fallbacks.":
    "Keine angegebene Relay-Liste gefunden. Stattdessen werden die Browsereinstellungen und Standard-Relays verwendet.",
  "Blossom must use HTTPS.": "Blossom muss HTTPS verwenden.",
  "Media settings saved on this browser.":
    "Medieneinstellungen in diesem Browser gespeichert.",
  "Request deletion? Copies may remain on other relays and clients.":
    "Löschung anfordern? Kopien können auf anderen Relays und Clients erhalten bleiben.",
  "Deletion request acknowledged. Network-wide removal is not guaranteed.":
    "Löschanfrage bestätigt. Eine netzwerkweite Entfernung ist nicht garantiert.",
  "Draft saved on this browser only.":
    "Entwurf nur in diesem Browser gespeichert.",
  "No draft saved for this identity on this browser.":
    "Für diese Identität ist in diesem Browser kein Entwurf gespeichert.",
  "Local draft restored. Review before publishing.":
    "Lokaler Entwurf wiederhergestellt. Vor dem Veröffentlichen prüfen.",
  "Processing photograph and requesting upload authorization…":
    "Foto wird verarbeitet und Upload-Berechtigung angefordert…",
  "Photograph uploaded. Publish the listing to share its URL.":
    "Foto hochgeladen. Veröffentlichen Sie das Inserat, um die URL zu teilen.",
  "Wait for the existing profile to finish loading.":
    "Warten Sie, bis das vorhandene Profil vollständig geladen ist.",
  "No existing profile was found on these relays. Publishing could replace a profile stored elsewhere and remove fields not shown here. Continue?":
    "Auf diesen Relays wurde kein vorhandenes Profil gefunden. Eine Veröffentlichung könnte ein anderswo gespeichertes Profil ersetzen und hier nicht angezeigte Felder entfernen. Fortfahren?",
  "Profile image and website must use HTTPS.":
    "Profilbild und Website müssen HTTPS verwenden.",
  "Browser settings saved. Public relay discovery settings are unchanged.":
    "Browsereinstellungen gespeichert. Die öffentlichen Relay-Sucheinstellungen bleiben unverändert.",
  "Replace your global NIP-65 relay list with the saved browser relay settings, all marked read/write?":
    "Ihre globale NIP-65-Relay-Liste durch die im Browser gespeicherten Relays ersetzen, alle als Lesen/Schreiben markiert?",
  "Listing cache cleared. Local drafts have not been removed.":
    "Inseratscache geleert. Lokale Entwürfe wurden nicht entfernt.",
  "Loading property from connected relays…":
    "Immobilie wird von verbundenen Relays geladen…",
  "This is not a valid NIP-99 listing address.":
    "Dies ist keine gültige NIP-99-Inseratsadresse.",
  "Listing unavailable, removed, or not found on the connected relays.":
    "Inserat nicht verfügbar, entfernt oder auf den verbundenen Relays nicht gefunden.",
  "Back to property search": "Zurück zur Immobiliensuche",
  "A signed event proves control of a key, not ownership of the property. Verify the property and publisher independently.":
    "Ein signiertes Event beweist die Kontrolle über einen Schlüssel, nicht das Eigentum an der Immobilie. Prüfen Sie die Immobilie und den Anbieter unabhängig.",
  "No exact map location supplied.": "Kein genauer Kartenstandort angegeben.",
  "Listing link copied.": "Inseratslink kopiert.",
  "Provide a valid npub to view a profile.":
    "Geben Sie eine gültige npub ein, um ein Profil anzusehen.",
  "Public Nostr profile": "Öffentliches Nostr-Profil",
  "Property publisher": "Immobilienanbieter",
  "Active listings loaded": "Aktive Inserate geladen",
  "No active real estate listings found on the connected relays.":
    "Keine aktiven Immobilieninserate auf den verbundenen Relays gefunden.",
  "Relays must use secure wss:// URLs without credentials or fragments.":
    "Relays müssen sichere wss://-URLs ohne Zugangsdaten oder Fragmente verwenden.",
  "Choose between one and eight relays.": "Wählen Sie ein bis acht Relays.",
  "Install a NIP-07 browser extension to sign.":
    "Installieren Sie zum Signieren eine NIP-07-Browsererweiterung.",
  "The extension returned an unexpected or invalid signed event.":
    "Die Erweiterung hat ein unerwartetes oder ungültiges signiertes Event zurückgegeben.",
  "No relay acknowledged this event. Keep this page open and retry the signed event.":
    "Kein Relay hat dieses Event bestätigt. Lassen Sie diese Seite geöffnet und senden Sie das signierte Event erneut.",
  "Blossom must use HTTPS without credentials.":
    "Blossom muss HTTPS ohne Zugangsdaten verwenden.",
  "Choose a JPEG, PNG, or WebP image below 20 MB.":
    "Wählen Sie ein JPEG-, PNG- oder WebP-Bild unter 20 MB.",
  "Image processing is unavailable.":
    "Die Bildverarbeitung ist nicht verfügbar.",
  "Cannot process image.": "Das Bild kann nicht verarbeitet werden.",
  "Blossom upload failed ({status}). Check provider access, CORS, or quota.":
    "Blossom-Upload fehlgeschlagen ({status}). Prüfen Sie Anbieterzugang, CORS oder Kontingent.",
  "Blossom returned an invalid image descriptor.":
    "Blossom hat einen ungültigen Bilddeskriptor zurückgegeben.",
  "For owners & agents": "Für Eigentümer und Makler",
  "Your property.": "Ihre Immobilie.",
  "A world of possibility.": "Eine Welt voller Möglichkeiten.",
  "From a city apartment to a place beyond the everyday, share your property with an international perspective. It is free to publish on Vastgoed.":
    "Von der Stadtwohnung bis zum außergewöhnlichen Rückzugsort: Präsentieren Sie Ihre Immobilie einem internationalen Publikum. Die Veröffentlichung auf Vastgoed ist kostenlos.",
  "Publish your listing for free": "Inserat kostenlos veröffentlichen",
  "Manage existing listings": "Vorhandene Inserate verwalten",
  "A compatible Nostr browser extension is required to publish. We never ask for your private key.":
    "Zum Veröffentlichen ist eine kompatible Nostr-Browsererweiterung nötig. Wir fragen niemals nach Ihrem privaten Schlüssel.",
  "Connect your identity": "Identität verbinden",
  "Use your Nostr extension to connect to the dashboard.":
    "Verbinden Sie sich über Ihre Nostr-Erweiterung mit der Übersicht.",
  "Create your listing": "Inserat erstellen",
  "Add your property details, photographs and preferred contact information.":
    "Fügen Sie Immobiliendetails, Fotos und Ihre bevorzugten Kontaktdaten hinzu.",
  "Publish to the network": "Im Netzwerk veröffentlichen",
  "Review your listing, then sign it with your extension and submit it to your chosen relays.":
    "Prüfen Sie Ihr Inserat, signieren Sie es mit Ihrer Erweiterung und senden Sie es an die gewählten Relays.",
  "External relay or media hosting fees may apply. Network availability and distribution depend on the services you choose.":
    "Für externe Relays oder Medienhosting können Gebühren anfallen. Netzwerkverfügbarkeit und Verbreitung hängen von den gewählten Diensten ab.",
  "The Vastgoed edit": "Die Vastgoed-Auswahl",
  "Good places. Fresh perspectives.": "Schöne Orte. Neue Perspektiven.",
  "Property stories, ideas for your next move and what is new at Vastgoed. A fresh perspective, delivered by email.":
    "Immobiliengeschichten, Ideen für Ihren nächsten Schritt und Neuigkeiten von Vastgoed. Neue Perspektiven per E-Mail.",
  "Email address": "E-Mail-Adresse",
  "Join the email list": "Newsletter abonnieren",
  "By joining, you agree to receive emails from Vastgoed. Unsubscribe at any time using the link in each email.":
    "Mit Ihrer Anmeldung stimmen Sie dem Erhalt von E-Mails von Vastgoed zu. Sie können sich jederzeit über den Link in jeder E-Mail abmelden.",
  "You are signed in. Make the Vastgoed edit your own.":
    "Sie sind angemeldet. Passen Sie die Vastgoed-Auswahl an Ihre Wünsche an.",
  "Manage email preferences": "E-Mail-Einstellungen verwalten",
  "Email membership is currently invitation only. Existing members can sign in to manage their preferences.":
    "Die E-Mail-Mitgliedschaft ist derzeit nur auf Einladung möglich. Bestehende Mitglieder können sich anmelden und ihre Einstellungen verwalten.",
  "Member account": "Mitgliedskonto",
  "Check your inbox for an email to confirm your subscription.":
    "Prüfen Sie Ihren Posteingang auf eine E-Mail zur Bestätigung Ihres Abonnements.",
  "The email list is not open at the moment. Explore our":
    "Der Newsletter ist derzeit nicht verfügbar. Entdecken Sie unsere",
  "for more perspectives on property.":
    "für weitere Perspektiven auf Immobilien.",
  "Property without borders.": "Immobilien ohne Grenzen.",
  "Connections without gatekeepers.": "Verbindungen ohne Vermittler.",
  "Read the guides": "Ratgeber lesen",
  "Your dashboard": "Ihre Übersicht",
  "An independent property network, built on Nostr.":
    "Ein unabhängiges Immobiliennetzwerk auf Basis von Nostr.",
  "Back to top ↑": "Nach oben ↑",
  "← Back to property search": "← Zurück zur Immobiliensuche",
  "← Explore properties": "← Immobilien entdecken",
  "← All guides": "← Alle Ratgeber",
  "More perspectives": "Weitere Perspektiven",
  "Find your next place": "Finden Sie Ihr nächstes Zuhause",
  "The Vastgoed.net journal": "Das Vastgoed.net-Magazin",
  "A broader": "Eine breitere",
  "perspective.": "Perspektive.",
  "Guides and ideas for finding your place in an open property world.":
    "Ratgeber und Ideen, um Ihren Platz in einer offenen Immobilienwelt zu finden.",
  "The journal": "Das Magazin",
  "A space for fresh perspectives.": "Raum für neue Perspektiven.",
  "There are no guides published yet. Come back soon.":
    "Es wurden noch keine Ratgeber veröffentlicht. Schauen Sie bald wieder vorbei.",
  "Explore properties": "Immobilien entdecken",
  Overview: "Überblick",
  "Property details": "Immobiliendetails",
  "About this property": "Über diese Immobilie",
  Gallery: "Galerie",
  "View all photos": "Alle Fotos ansehen",
  "Close gallery": "Galerie schließen",
  "Previous photo": "Vorheriges Foto",
  "Next photo": "Nächstes Foto",
  "Photo {current} of {total}": "Foto {current} von {total}",
  "No photographs supplied": "Keine Fotos vorhanden",
  "Contact the publisher": "Anbieter kontaktieren",
  "View publisher profile": "Anbieterprofil ansehen",
  "Copy npub": "npub kopieren",
  "Copy listing link": "Inseratslink kopieren",
  "Report listing": "Inserat melden",
  "Published by": "Veröffentlicht von",
  "Listing information": "Inseratsinformationen",
  "Listing address": "Inseratsadresse",
  Published: "Veröffentlicht",
  "Last updated": "Zuletzt aktualisiert",
  "Approximate location": "Ungefährer Standort",
  "Location is supplied by the publisher. Verify it independently.":
    "Der Standort wird vom Anbieter angegeben. Prüfen Sie ihn unabhängig.",
  "Stay in the loop.": "Bleiben Sie auf dem Laufenden.",
  "Sign up for the newsletter": "Newsletter abonnieren",
  "Manage newsletter preferences": "Newsletter-Einstellungen verwalten",
  "Email signup does not give permission to edit Nostr listings.":
    "Die E-Mail-Anmeldung berechtigt nicht zum Bearbeiten von Nostr-Inseraten.",
  "Membership is invitation only. Existing members can sign in.":
    "Eine Mitgliedschaft ist nur auf Einladung möglich. Bestehende Mitglieder können sich anmelden.",
  "Subscribe to the Vastgoed newsletter. Unsubscribe at any time.":
    "Abonnieren Sie den Vastgoed-Newsletter. Sie können sich jederzeit abmelden.",
  "Listing content is shown in the publisher’s original language.":
    "Der Inseratsinhalt wird in der Originalsprache des Anbieters angezeigt.",
  bed: "Schlafzimmer",
  beds: "Schlafzimmer",
  bath: "Badezimmer",
  baths: "Badezimmer",
  bedroom: "Schlafzimmer",
  bedrooms: "Schlafzimmer",
  bathroom: "Badezimmer",
  bathrooms: "Badezimmer",
  month: "Monat",
  week: "Woche",
  year: "Jahr",
  day: "Tag",
  hour: "Stunde",
  active: "aktiv",
  sold: "verkauft",
  rented: "vermietet",
  withdrawn: "zurückgezogen",
  house: "Haus",
  apartment: "Wohnung",
  land: "Grundstück",
  commercial: "Gewerbeimmobilie",
  other: "Sonstige",
  "Real estate": "Immobilien",
  Menu: "Menü",
  "How it works": "So funktioniert es",
  "My listings": "Meine Inserate",
  "Newsletter & membership": "Newsletter und Mitgliedschaft",
  "Membership account": "Mitgliedskonto",
  "You are signed in.": "Sie sind angemeldet.",
  "Sign in": "Anmelden",
  "Your membership is separate from your Nostr identity.":
    "Ihre Mitgliedschaft ist von Ihrer Nostr-Identität getrennt.",
  "Newsletter signup is only available on the live Vastgoed site.":
    "Die Newsletter-Anmeldung ist nur auf der Live-Website von Vastgoed verfügbar.",
  "No signup was sent. Open the live Vastgoed site to subscribe.":
    "Es wurde keine Anmeldung gesendet. Öffnen Sie die Live-Website von Vastgoed, um sich anzumelden.",
  "Membership is not enabled on this site.":
    "Die Mitgliedschaft ist auf dieser Website nicht aktiviert.",
  "Create a free membership to receive the Vastgoed newsletter.":
    "Melden Sie sich kostenlos an, um den Vastgoed-Newsletter zu erhalten.",
  "Email signup is available on the live Vastgoed site.":
    "Die E-Mail-Anmeldung ist auf der Live-Website von Vastgoed verfügbar.",
  "Newsletter signup requires the live Vastgoed site. No account or subscription was created in this preview.":
    "Die Newsletter-Anmeldung erfordert die Live-Website von Vastgoed. In dieser Vorschau wurde kein Konto oder Abonnement erstellt.",
  "This is a local preview. Email signup requires the live Vastgoed site; no subscription is created here.":
    "Dies ist eine lokale Vorschau. Die Anmeldung erfordert die Live-Website von Vastgoed; hier wird kein Abonnement erstellt.",
  "Email signup requires the live Vastgoed site. No subscription was created in this local preview.":
    "Die Anmeldung erfordert die Live-Website von Vastgoed. In dieser lokalen Vorschau wurde kein Abonnement erstellt.",
  "Join the email list. An email account cannot sign or manage Nostr listings, and verified email-to-npub pairing is not available in this release.":
    "Abonnieren Sie den Newsletter. Ein E-Mail-Konto kann keine Nostr-Inserate signieren oder verwalten. Eine verifizierte Verknüpfung von E-Mail und npub ist in dieser Version nicht verfügbar.",
  "Create your free listing": "Erstellen Sie Ihr kostenloses Inserat",
  "Start with your property, not an account.":
    "Beginnen Sie mit Ihrer Immobilie, nicht mit einem Konto.",
  "Add the details and choose your photographs first. No email signup is needed. Choose a publishing identity when you are ready.":
    "Fügen Sie zuerst die Angaben hinzu und wählen Sie Ihre Fotos aus. Eine E-Mail-Anmeldung ist nicht nötig. Wählen Sie eine Veröffentlichungsidentität, wenn Sie bereit sind.",
  "Upload selected photos": "Ausgewählte Fotos hochladen",
  "Selected photos stay on this device until you choose a signer and upload. Uploads are public.":
    "Ausgewählte Fotos bleiben auf diesem Gerät, bis Sie eine Signaturmethode wählen und sie hochladen. Uploads sind öffentlich.",
  Uploaded: "Hochgeladen",
  "Local photo, not uploaded": "Lokales Foto, nicht hochgeladen",
  "Remove photo": "Foto entfernen",
  "Choose at most 12 photographs per listing.":
    "Wählen Sie höchstens 12 Fotos pro Inserat.",
  "Photographs selected locally. Choose a signer and save your key backup before uploading.":
    "Fotos lokal ausgewählt. Wählen Sie eine Signaturmethode und speichern Sie Ihre Schlüsselsicherung vor dem Hochladen.",
  "Photographs selected locally. Choose a signer when you are ready to upload and publish.":
    "Fotos lokal ausgewählt. Wählen Sie eine Signaturmethode, wenn Sie zum Hochladen und Veröffentlichen bereit sind.",
  "Wait for the current photo upload to finish.":
    "Warten Sie, bis der aktuelle Foto-Upload abgeschlossen ist.",
  "Published descriptions, contact details, images and coordinates are public. Choose an extension or a new key pair to sign and publish. Keep your backup safe.":
    "Veröffentlichte Beschreibungen, Kontaktdaten, Bilder und Koordinaten sind öffentlich. Wählen Sie eine Erweiterung oder ein neues Schlüsselpaar zum Signieren und Veröffentlichen. Bewahren Sie Ihre Sicherung sicher auf.",
  "Publishing identity": "Veröffentlichungsidentität",
  "Choose how to sign. No email account is required.":
    "Wählen Sie Ihre Signaturmethode. Ein E-Mail-Konto ist nicht erforderlich.",
  "Use browser extension": "Browser-Erweiterung verwenden",
  "Generate a new key pair": "Neues Schlüsselpaar erzeugen",
  "An existing listing must keep its original publishing identity.":
    "Ein bestehendes Inserat muss seine ursprüngliche Veröffentlichungsidentität behalten.",
  "Back up your publishing key": "Sichern Sie Ihren Veröffentlichungsschlüssel",
  "Keep your key private. Vastgoed cannot recover it.":
    "Halten Sie Ihren Schlüssel geheim. Vastgoed kann ihn nicht wiederherstellen.",
  "The key stays in memory only. Reloading or disconnecting clears it.":
    "Der Schlüssel bleibt nur im Arbeitsspeicher. Neuladen oder Trennen der Verbindung löscht ihn.",
  "To manage listings later, import this backup into a trusted Nostr extension and connect it here.":
    "Importieren Sie diese Sicherung später in eine vertrauenswürdige Nostr-Erweiterung und verbinden Sie diese hier, um Inserate zu verwalten.",
  "Download private key backup":
    "Sicherung des privaten Schlüssels herunterladen",
  "I saved my private key backup and understand that losing it means losing control of my listings.":
    "Ich habe meine Sicherung des privaten Schlüssels gespeichert und verstehe, dass ihr Verlust den Verlust der Kontrolle über meine Inserate bedeutet.",
  "Switching identities clears the generated private key from memory. Save your backup first. Vastgoed cannot recover it. Continue?":
    "Ein Identitätswechsel löscht den erzeugten privaten Schlüssel aus dem Arbeitsspeicher. Speichern Sie zuerst Ihre Sicherung. Vastgoed kann ihn nicht wiederherstellen. Fortfahren?",
  "Choose a publishing identity before continuing.":
    "Wählen Sie eine Veröffentlichungsidentität, bevor Sie fortfahren.",
  "The publishing identity does not match the generated key.":
    "Die Veröffentlichungsidentität stimmt nicht mit dem erzeugten Schlüssel überein.",
  "Download your private key backup and confirm that you saved it before continuing.":
    "Laden Sie die Sicherung Ihres privaten Schlüssels herunter und bestätigen Sie vor dem Fortfahren, dass Sie sie gespeichert haben.",
  "Install a NIP-07 Nostr browser extension to sign with this identity.":
    "Installieren Sie eine NIP-07-Nostr-Browser-Erweiterung, um mit dieser Identität zu signieren.",
  "Could not connect to the browser extension. Please try again.":
    "Verbindung zur Browser-Erweiterung fehlgeschlagen. Versuchen Sie es erneut.",
  "The browser extension returned an invalid public key.":
    "Die Browser-Erweiterung hat einen ungültigen öffentlichen Schlüssel zurückgegeben.",
  "Could not generate a publishing key. Please try again.":
    "Der Veröffentlichungsschlüssel konnte nicht erzeugt werden. Versuchen Sie es erneut.",
  "Could not download your key backup. Please try again.":
    "Ihre Schlüsselsicherung konnte nicht heruntergeladen werden. Versuchen Sie es erneut.",
  "The publishing identity has changed. Please try again.":
    "Die Veröffentlichungsidentität hat sich geändert. Versuchen Sie es erneut.",
  "Generated key has been destroyed.": "Der erzeugte Schlüssel wurde gelöscht.",
  "An open property network": "Ein offenes Immobiliennetzwerk",
  "How Vastgoed works": "So funktioniert Vastgoed",
  "Find a place in Europe. Share your property for free. Keep control of your publishing identity.":
    "Finden Sie einen Ort in Europa. Teilen Sie Ihre Immobilie kostenlos. Behalten Sie die Kontrolle über Ihre Veröffentlichungsidentität.",
  "Getting started": "Erste Schritte",
  "01 / Explore": "01 / Entdecken",
  "02 / Create": "02 / Erstellen",
  "03 / Publish": "03 / Veröffentlichen",
  "Browse properties across Europe, refine your search and explore the map. You do not need an account to browse. Contact publishers using the details they choose to share.":
    "Entdecken Sie Immobilien in ganz Europa, verfeinern Sie Ihre Suche und erkunden Sie die Karte. Zum Stöbern benötigen Sie kein Konto. Kontaktieren Sie Anbieter über die von ihnen geteilten Angaben.",
  "Start with your property": "Beginnen Sie mit Ihrer Immobilie",
  "Open the composer and add your property details without an email signup. Stage photographs locally while you prepare your listing. Local previews are not published or backed up to the network.":
    "Öffnen Sie den Editor und ergänzen Sie die Immobiliendaten ohne E-Mail-Anmeldung. Wählen Sie Fotos lokal aus, während Sie Ihr Inserat vorbereiten. Lokale Vorschauen werden weder veröffentlicht noch im Netzwerk gesichert.",
  "Your listing. Your keys.": "Ihr Inserat. Ihre Schlüssel.",
  "Choose a compatible Nostr browser extension or generate a new key pair. Generated keys stay in memory only. Download and confirm your plaintext private key backup before public photo uploads or signing. Vastgoed cannot recover a lost key.":
    "Wählen Sie eine kompatible Nostr-Browser-Erweiterung oder erzeugen Sie ein neues Schlüsselpaar. Erzeugte Schlüssel bleiben nur im Arbeitsspeicher. Laden Sie Ihre Klartext-Sicherung des privaten Schlüssels herunter und bestätigen Sie deren Speicherung vor öffentlichen Foto-Uploads oder dem Signieren. Vastgoed kann einen verlorenen Schlüssel nicht wiederherstellen.",
  "Built on Nostr": "Auf Nostr aufgebaut",
  "An open network, not a locked account":
    "Ein offenes Netzwerk, kein geschlossenes Konto",
  "Your key signs your listings; relays distribute them. Keep the same identity to manage your published properties. Relay availability and media hosting depend on the services you choose, and external fees may apply.":
    "Ihr Schlüssel signiert Ihre Inserate; Relays verbreiten sie. Behalten Sie dieselbe Identität, um veröffentlichte Immobilien zu verwalten. Relay-Verfügbarkeit und Medienhosting hängen von den gewählten Diensten ab; externe Gebühren können anfallen.",
  "Before you publish": "Vor dem Veröffentlichen",
  "Do I need an email account to publish?":
    "Benötige ich zum Veröffentlichen ein E-Mail-Konto?",
  "No. Publishing uses a Nostr identity, not an email membership. The email list is optional and cannot sign or manage your listings.":
    "Nein. Zum Veröffentlichen dient eine Nostr-Identität, keine E-Mail-Mitgliedschaft. Der Newsletter ist optional und kann Ihre Inserate weder signieren noch verwalten.",
  "Who controls my listings?": "Wer kontrolliert meine Inserate?",
  "The publishing key is your authority to sign updates. Protect it and keep a secure backup. Vastgoed cannot recover a lost private key, and removing a listing does not guarantee that every relay or third party removes its copies.":
    "Der Veröffentlichungsschlüssel berechtigt Sie zum Signieren von Änderungen. Schützen Sie ihn und bewahren Sie eine sichere Kopie auf. Vastgoed kann einen verlorenen privaten Schlüssel nicht wiederherstellen. Das Entfernen eines Inserats garantiert nicht, dass jedes Relay oder jeder Dritte seine Kopien entfernt.",
  "What happens to my photographs?": "Was passiert mit meinen Fotos?",
  "Staging a photograph locally is not the same as uploading it. Published media is public. Review photographs for visible personal information before uploading to your chosen media host.":
    "Ein Foto lokal auszuwählen ist nicht dasselbe wie es hochzuladen. Veröffentlichte Medien sind öffentlich. Prüfen Sie Fotos auf sichtbare persönliche Angaben, bevor Sie sie beim gewählten Medienhost hochladen.",
  "How can I receive the Vastgoed edit?":
    "Wie erhalte ich die Vastgoed-Auswahl?",
  "Subscribe to the optional email list on the live Vastgoed site. Local preview does not create a subscription. Your membership is separate from your Nostr identity.":
    "Abonnieren Sie den optionalen Newsletter auf der Live-Website von Vastgoed. Die lokale Vorschau erstellt kein Abonnement. Ihre Mitgliedschaft ist von Ihrer Nostr-Identität getrennt.",
  "Subscribe to the optional email list on the live Vastgoed site. Your membership is separate from your Nostr identity.":
    "Abonnieren Sie den optionalen Newsletter auf der Live-Website von Vastgoed. Ihre Mitgliedschaft ist von Ihrer Nostr-Identität getrennt.",
  "Guides and ideas": "Ratgeber und Ideen",
  "Field notes": "Notizen vor Ort",
  "Read the story": "Artikel lesen",
  "There are no journal articles published yet. The getting-started guide above is always available.":
    "Es wurden noch keine Magazinartikel veröffentlicht. Der Leitfaden für den Einstieg oben ist jederzeit verfügbar.",
  "Start with your property and photographs. No signup is needed. Choose a browser extension or generate a new key pair when you are ready.":
    "Beginnen Sie mit Ihrer Immobilie und Ihren Fotos. Eine Anmeldung ist nicht nötig. Wählen Sie eine Browser-Erweiterung oder erzeugen Sie ein neues Schlüsselpaar, wenn Sie bereit sind.",
  "Add your property details and select photographs locally, without an account.":
    "Ergänzen Sie die Immobiliendaten und wählen Sie Fotos lokal aus, ohne Konto.",
  "Choose your publishing identity":
    "Wählen Sie Ihre Veröffentlichungsidentität",
  "Use a browser extension or generate a new key pair. Generated keys stay in memory only: download and confirm your plaintext backup before public uploads or signing.":
    "Verwenden Sie eine Browser-Erweiterung oder erzeugen Sie ein neues Schlüsselpaar. Erzeugte Schlüssel bleiben nur im Arbeitsspeicher: Laden Sie Ihre Klartext-Sicherung herunter und bestätigen Sie deren Speicherung vor öffentlichen Uploads oder dem Signieren.",
  "Upload your selected photographs, review your listing, then sign and publish to your chosen relays.":
    "Laden Sie Ihre ausgewählten Fotos hoch, prüfen Sie Ihr Inserat und signieren und veröffentlichen Sie es auf den gewählten Relays.",
} satisfies Record<keyof typeof nl, string>;

export default de;
