import type nl from "./nl";

const fr = {
  Contact: "Contact",
  "Let's connect.": "Prenons contact.",
  "Have a question, an idea, or want to work together? Email us and we will take it from there.":
    "Une question, une idée ou envie de collaborer ? Écrivez-nous et nous en discuterons ensemble.",
  "Email Vastgoed": "Écrire à Vastgoed",
  "Listing pagination": "Pagination des annonces",
  "Previous page": "Page précédente",
  "Next page": "Page suivante",
  "Go to page {page}": "Aller à la page {page}",
  "Page {current} of {total}": "Page {current} sur {total}",
  "Showing {from} to {to} of {total} loaded matches":
    "Résultats {from} à {to} sur {total} correspondances chargées",
  "Map shows loaded matches, not just this page.":
    "La carte affiche les résultats chargés, pas seulement cette page.",
  "The backup is an unencrypted text file. Keep it offline and never share it.":
    "La sauvegarde est un fichier texte non chiffré. Conservez-le hors ligne et ne le partagez jamais.",
  "Public key copied.": "Clé publique copiée.",
  "Listing preview": "Aperçu de l’annonce",
  "Preview listing": "Prévisualiser l’annonce",
  "Close preview": "Fermer l’aperçu",
  "Back to editor": "Retour à l’éditeur",
  "Unpublished preview": "Aperçu non publié",
  "This preview is only visible in this browser. Nothing has been signed or published.":
    "Cet aperçu est uniquement visible dans ce navigateur. Rien n’a été signé ni publié.",
  "Review the listing fields before opening the preview.":
    "Vérifiez les champs de l’annonce avant d’ouvrir l’aperçu.",
  "Close photos": "Fermer les photos",
  "No description supplied.": "Aucune description fournie.",
  "Listing source & authenticity": "Source et authenticité de l’annonce",
  "Listing identifier": "Identifiant de l’annonce",
  "Publisher public key": "Clé publique de l’annonceur",
  "Event ID": "Identifiant de l’événement",
  "Nostr publisher": "Annonceur Nostr",
  "Visit website": "Consulter le site web",
  Newsletter: "Newsletter",
  "Property stories, ideas for your next move and what is new at Vastgoed, delivered by email.":
    "Des récits immobiliers, des idées pour votre prochaine étape et les nouveautés de Vastgoed, par e-mail.",
  "By signing up, you agree to receive emails from Vastgoed. Unsubscribe at any time using the link in each email.":
    "En vous inscrivant, vous acceptez de recevoir des e-mails de Vastgoed. Désinscrivez-vous à tout moment via le lien présent dans chaque e-mail.",
  "Zoom in": "Zoomer",
  "Zoom out": "Dézoomer",
  "Reset bearing to north": "Orienter la carte vers le nord",
  "Enter fullscreen": "Passer en plein écran",
  "Exit fullscreen": "Quitter le plein écran",
  "Toggle attribution": "Afficher ou masquer les crédits",
  "Map attribution": "Crédits de la carte",
  "Find my location": "Trouver ma position",
  searching: "recherche en cours",
  "request failed": "échec de la requête",
  "{count} listing events returned": "{count} événements d’annonce reçus",
  "{count} events returned": "{count} événements reçus",
  "{count} bed": "{count} chambre",
  "{count} beds": "{count} chambres",
  "{count} bath": "{count} salle de bains",
  "{count} baths": "{count} salles de bains",
  "{count} m²": "{count} m²",
  "Empty responses can indicate no matches, access restrictions, or timeouts; they do not establish complete coverage.":
    "Des réponses vides peuvent indiquer une absence de résultats, des restrictions d’accès ou des délais dépassés ; elles ne prouvent pas une couverture complète.",
  "On request": "Sur demande",
  "Not supplied": "Non renseigné",
  "Floor area": "Surface de plancher",
  Villa: "Villa",
  Studio: "Studio",
  Townhouse: "Maison mitoyenne",
  "Property navigation": "Navigation immobilière",
  "Property photos": "Photos du bien",
  "Photo unavailable": "Photo indisponible",
  "This listing is not active and is not shown in active search results.":
    "Cette annonce n’est pas active et n’apparaît pas dans les résultats de recherche actifs.",
  "This listing is {status} and is not shown in active search results.":
    "Cette annonce est {status} et n’apparaît pas dans les résultats de recherche actifs.",
  "title is required": "Le titre est obligatoire",
  "description is required": "La description est obligatoire",
  "location is required": "L’emplacement est obligatoire",
  "currency is required": "La devise est obligatoire",
  "identifier is required": "L’identifiant est obligatoire",
  "publishedAt must be a non-negative integer":
    "La date de publication doit être un entier positif ou nul",
  "currency must be a three-letter code":
    "La devise doit être un code de trois lettres",
  "country must be a two-letter ISO code":
    "Le pays doit être un code ISO de deux lettres",
  "transaction must be sale or rent":
    "La transaction doit être une vente ou une location",
  "status must be active, sold, rented, or withdrawn":
    "Le statut doit être actif, vendu, loué ou retiré",
  "latitude and longitude must both be provided":
    "La latitude et la longitude doivent être renseignées ensemble",
  "images must use safe HTTPS URLs":
    "Les images doivent utiliser des URL HTTPS sûres",
  Language: "Langue",
  "Current interface language": "Langue actuelle de l’interface",
  "Skip to content": "Aller au contenu",
  "Vastgoed.net home": "Accueil Vastgoed.net",
  "Main navigation": "Navigation principale",
  "Footer navigation": "Navigation de pied de page",
  "Property search": "Recherche immobilière",
  Guides: "Guides",
  guides: "guides",
  Dashboard: "Tableau de bord",
  "Email list": "Newsletter",
  "Publish for free": "Publier gratuitement",
  "Not connected": "Non connecté",
  Connect: "Se connecter",
  "Connect Nostr": "Connecter Nostr",
  Disconnect: "Se déconnecter",
  "Loading property search...": "Chargement de la recherche immobilière...",
  "Property, without borders": "L’immobilier sans frontières",
  "Find your next place.": "Trouvez votre prochain chez-vous.",
  "active listings loaded": "annonces actives chargées",
  "City, region or keywords": "Ville, région ou mots-clés",
  "Where would you like to live?": "Où aimeriez-vous vivre ?",
  "Looking to": "Vous souhaitez",
  "Buy or rent": "Acheter ou louer",
  Buy: "Acheter",
  Rent: "Louer",
  "Property type": "Type de bien",
  "All property types": "Tous les types de biens",
  Apartment: "Appartement",
  House: "Maison",
  Land: "Terrain",
  Commercial: "Bien commercial",
  Other: "Autre",
  "Apply filters": "Appliquer les filtres",
  "More filters": "Plus de filtres",
  Reset: "Réinitialiser",
  "An open property network. No login to explore.":
    "Un réseau immobilier ouvert. Explorez sans vous connecter.",
  "Country code": "Code pays",
  Currency: "Devise",
  "Minimum price": "Prix minimum",
  "Maximum price": "Prix maximum",
  "Minimum bedrooms": "Nombre minimum de chambres",
  "Price period": "Période du prix",
  "Any period": "Toutes les périodes",
  "One-time price": "Prix unique",
  "Per month": "Par mois",
  "Per week": "Par semaine",
  "Per year": "Par an",
  "Per day": "Par jour",
  "properties to explore": "biens à découvrir",
  Sort: "Trier",
  "Newest first": "Les plus récentes d’abord",
  "Oldest first": "Les plus anciennes d’abord",
  "Search layout": "Affichage de la recherche",
  List: "Liste",
  Split: "Vue partagée",
  Map: "Carte",
  "Property results": "Résultats immobiliers",
  "Property map": "Carte des biens",
  "Search this map area": "Rechercher dans cette zone",
  "Clear area": "Effacer la zone",
  "properties on the map": "biens sur la carte",
  "Locations may be approximate": "Les emplacements peuvent être approximatifs",
  "Load more from relays": "Charger plus depuis les relais",
  "Refresh latest": "Actualiser les dernières annonces",
  "Showing listings retrieved from connected relays, not a complete market index. A signature does not verify property ownership. Verify properties and publishers independently.":
    "Les annonces affichées proviennent des relais connectés et ne constituent pas un inventaire complet du marché. Une signature ne prouve pas la propriété d’un bien. Vérifiez les biens et les annonceurs de manière indépendante.",
  "Network coverage & relay settings":
    "Couverture du réseau et paramètres des relais",
  "Discovery relays (maximum 8)": "Relais de recherche (8 maximum)",
  "Save and reload": "Enregistrer et recharger",
  "Wait for the current relay discovery to finish before changing sources.":
    "Attendez la fin de la recherche sur les relais avant de modifier les sources.",
  "Map tiles could not be loaded. Property results are still available.":
    "Le fond de carte n’a pas pu être chargé. Les résultats immobiliers restent disponibles.",
  "Map tiles could not be loaded. Property details are still available.":
    "Le fond de carte n’a pas pu être chargé. Les détails du bien restent disponibles.",
  "The map needs WebGL. Listing search is still available.":
    "La carte nécessite WebGL. La recherche d’annonces reste disponible.",
  "Choose a currency in More filters before applying a price range. Different currencies cannot be compared directly.":
    "Choisissez une devise dans Plus de filtres avant d’appliquer une fourchette de prix. Les devises différentes ne sont pas directement comparables.",
  "Minimum price must not be higher than maximum price.":
    "Le prix minimum ne peut pas dépasser le prix maximum.",
  "Choose a price period in More filters, or select Buy for one-time prices. Weekly and monthly rents cannot be compared directly.":
    "Choisissez une période dans Plus de filtres, ou sélectionnez Acheter pour les prix uniques. Les loyers hebdomadaires et mensuels ne sont pas directement comparables.",
  "An open door to something new":
    "Une porte ouverte sur de nouvelles possibilités",
  "Exploring the property network...": "Exploration du réseau immobilier...",
  "Your next place is out there.": "Votre prochain chez-vous vous attend.",
  "Searching connected relays for property listings. Results will appear as they arrive.":
    "Recherche d’annonces immobilières sur les relais connectés. Les résultats s’affichent au fur et à mesure.",
  "No matching properties loaded yet. Try a broader search or load more from the network.":
    "Aucun bien correspondant n’est encore chargé. Élargissez votre recherche ou chargez davantage d’annonces du réseau.",
  "Have a place to share? Publish for free":
    "Un bien à proposer ? Publiez gratuitement",
  "Your property. Your identity. No listing fee from Vastgoed.":
    "Votre bien. Votre identité. Aucun frais d’annonce facturé par Vastgoed.",
  "Get a fresh perspective. Join the email list":
    "Un nouveau regard. Inscrivez-vous à la newsletter",
  "Loading…": "Chargement…",
  "Map area applied": "Zone de la carte appliquée",
  "{count} matching properties / {total} active properties loaded":
    "{count} biens correspondants / {total} biens actifs chargés",
  "{count} listing loaded": "{count} annonce chargée",
  "{count} listings loaded": "{count} annonces chargées",
  "{count} listing in this view": "{count} annonce dans cette vue",
  "{count} listings in this view": "{count} annonces dans cette vue",
  "{count} properties to explore": "{count} biens à découvrir",
  "{count} active listings loaded": "{count} annonces actives chargées",
  "{count} properties on the map": "{count} biens sur la carte",
  "No photograph supplied": "Aucune photo fournie",
  "Photograph unavailable": "Photo indisponible",
  "For rent": "À louer",
  "For sale": "À vendre",
  Property: "Bien immobilier",
  "Location not supplied": "Emplacement non renseigné",
  "Published on Nostr": "Publié sur Nostr",
  "Something went wrong.": "Une erreur s’est produite.",
  "Install a NIP-07 browser extension such as nos2x or Alby to manage listings. Browsing and email signup do not need an extension.":
    "Installez une extension NIP-07 comme nos2x ou Alby pour gérer les annonces. La consultation et l’inscription à la newsletter ne nécessitent pas d’extension.",
  "The extension returned an invalid public key.":
    "L’extension a renvoyé une clé publique non valide.",
  "Wait for the current signing or publication request to finish.":
    "Attendez la fin de la demande de signature ou de publication en cours.",
  "Identity changed during signing. Reconnect and try again.":
    "L’identité a changé pendant la signature. Reconnectez-vous et réessayez.",
  "Connect the identity that signed this event before retrying.":
    "Connectez l’identité qui a signé cet événement avant de réessayer.",
  "Partial success: retry to reach the remaining relays.":
    "Succès partiel : réessayez pour atteindre les autres relais.",
  "Discovering your profile and advertised relays…":
    "Recherche de votre profil et de vos relais déclarés…",
  "Searching your relays…": "Recherche sur vos relais…",
  "My Listings": "Mes annonces",
  Profile: "Profil",
  Relays: "Relais",
  "Media & Storage": "Médias et stockage",
  Email: "E-mail",
  "New Listing": "Nouvelle annonce",
  "Edit Listing": "Modifier l’annonce",
  "Your Nostr workspace": "Votre espace Nostr",
  "Nostr account": "Compte Nostr",
  "Open navigation": "Ouvrir la navigation",
  "Close navigation": "Fermer la navigation",
  "Client sidebar": "Barre latérale du client",
  "Dashboard navigation": "Navigation du tableau de bord",
  "Extension or public npub": "Extension ou npub publique",
  "Browse Properties": "Parcourir les biens",
  "Switch account / Disconnect": "Changer de compte / Se déconnecter",
  "Connect an account": "Connecter un compte",
  "Loading account…": "Chargement du compte…",
  "No private key required": "Aucune clé privée nécessaire",
  "Vastgoed / Nostr client": "Vastgoed / Client Nostr",
  "Refresh from relays": "Actualiser depuis les relais",
  "Loading your account from its relays. Editing becomes available when discovery finishes.":
    "Chargement de votre compte depuis ses relais. La modification sera disponible à la fin de la recherche.",
  "Your property workspace": "Votre espace immobilier",
  "Open doors. Keep your keys.": "Ouvrez les portes. Gardez vos clés.",
  "Connect a NIP-07 browser extension to manage your profile, properties and relays. We never ask for your private key.":
    "Connectez une extension NIP-07 pour gérer votre profil, vos biens et vos relais. Nous ne demandons jamais votre clé privée.",
  "Prefer to stay informed?": "Vous préférez rester informé ?",
  "Your listings. Your identity.": "Vos annonces. Votre identité.",
  "Load existing listings with your public npub, or connect your browser extension. Signing is only needed to publish changes.":
    "Chargez vos annonces existantes avec votre npub publique ou connectez votre extension. Une signature n’est nécessaire que pour publier des modifications.",
  "Your npub": "Votre npub",
  "Load my listings": "Charger mes annonces",
  "Never enter an nsec or private key.":
    "Ne saisissez jamais de nsec ni de clé privée.",
  "Enter a valid public npub. Never enter a private key.":
    "Saisissez une npub publique valide. Ne saisissez jamais de clé privée.",
  "Enter a public npub, not an nsec or another Nostr identifier.":
    "Saisissez une npub publique, pas une nsec ni un autre identifiant Nostr.",
  "Make your next move.": "Préparez votre prochaine étape.",
  "Listings and profiles are public. Exact coordinates and contact details will be visible to anyone. Local drafts stay on this browser and can be lost if its storage is cleared.":
    "Les annonces et profils sont publics. Les coordonnées exactes et les informations de contact seront visibles par tous. Les brouillons locaux restent dans ce navigateur et peuvent être perdus si son stockage est effacé.",
  "Your listings": "Vos annonces",
  "New listing": "Nouvelle annonce",
  "Unsupported listing": "Annonce non prise en charge",
  "Unknown status": "Statut inconnu",
  Edit: "Modifier",
  Delete: "Supprimer",
  View: "Voir",
  "No listings loaded from these relays yet.":
    "Aucune annonce chargée depuis ces relais pour le moment.",
  "Edit property": "Modifier le bien",
  "List a property": "Proposer un bien",
  Title: "Titre",
  "Short summary": "Bref résumé",
  Location: "Emplacement",
  "City, region, country": "Ville, région, pays",
  Transaction: "Transaction",
  "Price (blank = on request)": "Prix (vide = sur demande)",
  "Currency code": "Code de devise",
  "Rental period": "Période de location",
  "One-time / not supplied": "Unique / non renseigné",
  Bedrooms: "Chambres",
  Bathrooms: "Salles de bains",
  "Area in m²": "Superficie en m²",
  "Latitude (optional)": "Latitude (facultatif)",
  "Longitude (optional)": "Longitude (facultatif)",
  Availability: "Disponibilité",
  Active: "Active",
  Sold: "Vendu",
  Rented: "Loué",
  Withdrawn: "Retiré",
  "Description / public contact details": "Description / coordonnées publiques",
  "Image URLs (HTTPS, one per line)": "URL des images (HTTPS, une par ligne)",
  "Upload a photograph": "Envoyer une photo",
  "Uploads are public. Images are resized and re-encoded to strip EXIF. Review photos for visible private information.":
    "Les fichiers envoyés sont publics. Les images sont redimensionnées et réencodées pour supprimer les données EXIF. Vérifiez qu’aucune information privée n’est visible sur les photos.",
  "Sign and publish": "Signer et publier",
  "Save local draft": "Enregistrer le brouillon local",
  "Restore local draft": "Restaurer le brouillon local",
  "Your public profile": "Votre profil public",
  Name: "Nom",
  "Display name": "Nom affiché",
  About: "À propos",
  "Picture URL": "URL de la photo",
  Website: "Site web",
  "Sign profile update": "Signer la mise à jour du profil",
  "Other profile fields are preserved. Changes affect your identity across Nostr clients.":
    "Les autres champs du profil sont conservés. Les modifications s’appliquent à votre identité dans tous les clients Nostr.",
  "Relays and media": "Relais et médias",
  "Session publishing / read relays":
    "Relais de publication / lecture de la session",
  "Blossom upload server": "Serveur d’envoi Blossom",
  "Save browser settings": "Enregistrer les paramètres du navigateur",
  "Publish these as my NIP-65 relay list":
    "Publier ces relais comme ma liste NIP-65",
  "Publishing replaces your global relay list with these relays as read/write relays. It does not change the public discovery settings.":
    "La publication remplace votre liste globale par ces relais en lecture/écriture. Les paramètres de recherche publique ne sont pas modifiés.",
  "Retry last signed event": "Renvoyer le dernier événement signé",
  "Clear listing cache": "Vider le cache des annonces",
  "Email membership": "Adhésion par e-mail",
  "All listings": "Toutes les annonces",
  "Listing status": "Statut de l’annonce",
  "Sold / Rented / Withdrawn": "Vendu / Loué / Retiré",
  "Resume local draft": "Reprendre le brouillon local",
  "Loaded listings": "Annonces chargées",
  Searching: "Recherche",
  Updated: "Mis à jour",
  "Relay discovery": "Recherche sur les relais",
  "Searching your advertised relays for existing listings…":
    "Recherche d’annonces existantes sur vos relais déclarés…",
  "No NIP-99 listings were returned by these relays. Check Relays, add a missing relay, and refresh.":
    "Ces relais n’ont renvoyé aucune annonce NIP-99. Vérifiez les relais, ajoutez un relais manquant et actualisez.",
  "Published descriptions, contact details, images and coordinates are public. Local drafts stay on this device. Saving to Nostr requires a signature from the matching browser extension.":
    "Les descriptions, informations de contact, images et coordonnées publiées sont publiques. Les brouillons locaux restent sur cet appareil. L’enregistrement sur Nostr nécessite une signature de l’extension correspondante.",
  "Images are uploaded directly from your browser to Blossom. Your own server can be set here later.":
    "Les images sont envoyées directement de votre navigateur vers Blossom. Vous pourrez configurer votre propre serveur ici plus tard.",
  "Save media settings": "Enregistrer les paramètres des médias",
  "Upload property photographs from the listing editor. Files are public and are re-encoded to strip EXIF metadata.":
    "Envoyez les photos du bien depuis l’éditeur d’annonce. Les fichiers sont publics et réencodés pour supprimer les métadonnées EXIF.",
  "Your advertised NIP-65 relays are used to find existing listings. Updates are sent to your write relays as well as the browser publishing settings.":
    "Vos relais NIP-65 déclarés servent à retrouver les annonces existantes. Les mises à jour sont envoyées à vos relais d’écriture ainsi qu’aux relais de publication configurés dans le navigateur.",
  Read: "Lecture",
  Write: "Écriture",
  "Read / Write": "Lecture / Écriture",
  "No advertised relay list found. Browser settings and default relays are used as fallbacks.":
    "Aucune liste de relais déclarée trouvée. Les paramètres du navigateur et les relais par défaut sont utilisés en remplacement.",
  "Blossom must use HTTPS.": "Blossom doit utiliser HTTPS.",
  "Media settings saved on this browser.":
    "Paramètres des médias enregistrés dans ce navigateur.",
  "Request deletion? Copies may remain on other relays and clients.":
    "Demander la suppression ? Des copies peuvent subsister sur d’autres relais et clients.",
  "Deletion request acknowledged. Network-wide removal is not guaranteed.":
    "Demande de suppression confirmée. La suppression sur tout le réseau n’est pas garantie.",
  "Draft saved on this browser only.":
    "Brouillon enregistré uniquement dans ce navigateur.",
  "No draft saved for this identity on this browser.":
    "Aucun brouillon enregistré pour cette identité dans ce navigateur.",
  "Local draft restored. Review before publishing.":
    "Brouillon local restauré. Vérifiez-le avant de publier.",
  "Processing photograph and requesting upload authorization…":
    "Traitement de la photo et demande d’autorisation d’envoi…",
  "Photograph uploaded. Publish the listing to share its URL.":
    "Photo envoyée. Publiez l’annonce pour partager son URL.",
  "Wait for the existing profile to finish loading.":
    "Attendez la fin du chargement du profil existant.",
  "No existing profile was found on these relays. Publishing could replace a profile stored elsewhere and remove fields not shown here. Continue?":
    "Aucun profil existant n’a été trouvé sur ces relais. La publication pourrait remplacer un profil stocké ailleurs et supprimer des champs non affichés ici. Continuer ?",
  "Profile image and website must use HTTPS.":
    "La photo de profil et le site web doivent utiliser HTTPS.",
  "Browser settings saved. Public relay discovery settings are unchanged.":
    "Paramètres du navigateur enregistrés. Les paramètres de recherche publique sur les relais sont inchangés.",
  "Replace your global NIP-65 relay list with the saved browser relay settings, all marked read/write?":
    "Remplacer votre liste globale de relais NIP-65 par les relais enregistrés dans le navigateur, tous en lecture/écriture ?",
  "Listing cache cleared. Local drafts have not been removed.":
    "Cache des annonces vidé. Les brouillons locaux n’ont pas été supprimés.",
  "Loading property from connected relays…":
    "Chargement du bien depuis les relais connectés…",
  "This is not a valid NIP-99 listing address.":
    "Cette adresse d’annonce NIP-99 n’est pas valide.",
  "Listing unavailable, removed, or not found on the connected relays.":
    "Annonce indisponible, supprimée ou introuvable sur les relais connectés.",
  "Back to property search": "Retour à la recherche immobilière",
  "A signed event proves control of a key, not ownership of the property. Verify the property and publisher independently.":
    "Un événement signé prouve le contrôle d’une clé, pas la propriété du bien. Vérifiez le bien et l’annonceur de manière indépendante.",
  "No exact map location supplied.":
    "Aucun emplacement exact fourni pour la carte.",
  "Listing link copied.": "Lien de l’annonce copié.",
  "Provide a valid npub to view a profile.":
    "Indiquez une npub valide pour consulter un profil.",
  "Public Nostr profile": "Profil Nostr public",
  "Property publisher": "Annonceur immobilier",
  "Active listings loaded": "Annonces actives chargées",
  "No active real estate listings found on the connected relays.":
    "Aucune annonce immobilière active trouvée sur les relais connectés.",
  "Relays must use secure wss:// URLs without credentials or fragments.":
    "Les relais doivent utiliser des URL wss:// sécurisées, sans identifiants ni fragments.",
  "Choose between one and eight relays.": "Choisissez entre un et huit relais.",
  "Install a NIP-07 browser extension to sign.":
    "Installez une extension NIP-07 pour signer.",
  "The extension returned an unexpected or invalid signed event.":
    "L’extension a renvoyé un événement signé inattendu ou non valide.",
  "No relay acknowledged this event. Keep this page open and retry the signed event.":
    "Aucun relais n’a confirmé cet événement. Gardez cette page ouverte et renvoyez l’événement signé.",
  "Blossom must use HTTPS without credentials.":
    "Blossom doit utiliser HTTPS sans identifiants.",
  "Choose a JPEG, PNG, or WebP image below 20 MB.":
    "Choisissez une image JPEG, PNG ou WebP de moins de 20 Mo.",
  "Image processing is unavailable.":
    "Le traitement des images est indisponible.",
  "Cannot process image.": "Impossible de traiter l’image.",
  "Blossom upload failed ({status}). Check provider access, CORS, or quota.":
    "Échec de l’envoi Blossom ({status}). Vérifiez l’accès au fournisseur, CORS ou le quota.",
  "Blossom returned an invalid image descriptor.":
    "Blossom a renvoyé un descripteur d’image non valide.",
  "For owners & agents": "Pour les propriétaires et les agents immobiliers",
  "Your property.": "Votre bien.",
  "A world of possibility.": "Un monde de possibilités.",
  "From a city apartment to a place beyond the everyday, share your property with an international perspective. It is free to publish on Vastgoed.":
    "D’un appartement en ville à un lieu hors du commun, présentez votre bien à un public international. La publication sur Vastgoed est gratuite.",
  "Publish your listing for free": "Publiez votre annonce gratuitement",
  "Manage existing listings": "Gérer les annonces existantes",
  "A compatible Nostr browser extension is required to publish. We never ask for your private key.":
    "Une extension Nostr compatible est nécessaire pour publier. Nous ne demandons jamais votre clé privée.",
  "Connect your identity": "Connectez votre identité",
  "Use your Nostr extension to connect to the dashboard.":
    "Utilisez votre extension Nostr pour vous connecter au tableau de bord.",
  "Create your listing": "Créez votre annonce",
  "Add your property details, photographs and preferred contact information.":
    "Ajoutez les détails du bien, des photos et vos coordonnées de contact préférées.",
  "Publish to the network": "Publiez sur le réseau",
  "Review your listing, then sign it with your extension and submit it to your chosen relays.":
    "Vérifiez votre annonce, signez-la avec votre extension et envoyez-la aux relais de votre choix.",
  "External relay or media hosting fees may apply. Network availability and distribution depend on the services you choose.":
    "Des frais de relais ou d’hébergement des médias peuvent s’appliquer. La disponibilité et la diffusion sur le réseau dépendent des services choisis.",
  "The Vastgoed edit": "La sélection Vastgoed",
  "Good places. Fresh perspectives.": "De beaux lieux. De nouveaux regards.",
  "Property stories, ideas for your next move and what is new at Vastgoed. A fresh perspective, delivered by email.":
    "Des récits immobiliers, des idées pour votre prochaine étape et les nouveautés de Vastgoed. Un regard neuf, par e-mail.",
  "Email address": "Adresse e-mail",
  "Join the email list": "S’inscrire à la newsletter",
  "By joining, you agree to receive emails from Vastgoed. Unsubscribe at any time using the link in each email.":
    "En vous inscrivant, vous acceptez de recevoir des e-mails de Vastgoed. Désinscrivez-vous à tout moment via le lien présent dans chaque e-mail.",
  "You are signed in. Make the Vastgoed edit your own.":
    "Vous êtes connecté. Personnalisez votre sélection Vastgoed.",
  "Manage email preferences": "Gérer les préférences e-mail",
  "Email membership is currently invitation only. Existing members can sign in to manage their preferences.":
    "L’adhésion par e-mail est actuellement sur invitation uniquement. Les membres existants peuvent se connecter pour gérer leurs préférences.",
  "Member account": "Compte membre",
  "Check your inbox for an email to confirm your subscription.":
    "Consultez votre boîte de réception pour confirmer votre inscription par e-mail.",
  "The email list is not open at the moment. Explore our":
    "La newsletter n’est pas disponible pour le moment. Consultez nos",
  "for more perspectives on property.":
    "pour découvrir d’autres regards sur l’immobilier.",
  "Property without borders.": "L’immobilier sans frontières.",
  "Connections without gatekeepers.": "Des liens sans intermédiaires.",
  "Read the guides": "Lire les guides",
  "Your dashboard": "Votre tableau de bord",
  "An independent property network, built on Nostr.":
    "Un réseau immobilier indépendant, construit sur Nostr.",
  "Back to top ↑": "Retour en haut ↑",
  "← Back to property search": "← Retour à la recherche immobilière",
  "← Explore properties": "← Découvrir les biens",
  "← All guides": "← Tous les guides",
  "More perspectives": "D’autres regards",
  "Find your next place": "Trouvez votre prochain chez-vous",
  "The Vastgoed.net journal": "Le journal Vastgoed.net",
  "A broader": "Une autre",
  "perspective.": "perspective.",
  "Guides and ideas for finding your place in an open property world.":
    "Des guides et des idées pour trouver votre place dans un monde immobilier ouvert.",
  "The journal": "Le journal",
  "A space for fresh perspectives.": "Un espace pour de nouveaux regards.",
  "There are no guides published yet. Come back soon.":
    "Aucun guide n’est encore publié. Revenez bientôt.",
  "Explore properties": "Découvrir les biens",
  Overview: "Vue d’ensemble",
  "Property details": "Détails du bien",
  "About this property": "À propos de ce bien",
  Gallery: "Galerie",
  "View all photos": "Voir toutes les photos",
  "Close gallery": "Fermer la galerie",
  "Previous photo": "Photo précédente",
  "Next photo": "Photo suivante",
  "Photo {current} of {total}": "Photo {current} sur {total}",
  "No photographs supplied": "Aucune photo fournie",
  "Contact the publisher": "Contacter l’annonceur",
  "View publisher profile": "Voir le profil de l’annonceur",
  "Copy npub": "Copier la npub",
  "Copy listing link": "Copier le lien de l’annonce",
  "Report listing": "Signaler l’annonce",
  "Published by": "Publié par",
  "Listing information": "Informations sur l’annonce",
  "Listing address": "Adresse de l’annonce",
  Published: "Publié",
  "Last updated": "Dernière mise à jour",
  "Approximate location": "Emplacement approximatif",
  "Location is supplied by the publisher. Verify it independently.":
    "L’emplacement est fourni par l’annonceur. Vérifiez-le de manière indépendante.",
  "Stay in the loop.": "Restez au courant.",
  "Sign up for the newsletter": "S’inscrire à la newsletter",
  "Manage newsletter preferences": "Gérer les préférences de la newsletter",
  "Email signup does not give permission to edit Nostr listings.":
    "L’inscription par e-mail ne donne pas le droit de modifier les annonces Nostr.",
  "Membership is invitation only. Existing members can sign in.":
    "L’adhésion se fait uniquement sur invitation. Les membres existants peuvent se connecter.",
  "Subscribe to the Vastgoed newsletter. Unsubscribe at any time.":
    "Inscrivez-vous à la newsletter Vastgoed. Désinscrivez-vous à tout moment.",
  "Listing content is shown in the publisher’s original language.":
    "Le contenu de l’annonce est affiché dans la langue d’origine de l’annonceur.",
  bed: "chambre",
  beds: "chambres",
  bath: "salle de bains",
  baths: "salles de bains",
  bedroom: "chambre",
  bedrooms: "chambres",
  bathroom: "salle de bains",
  bathrooms: "salles de bains",
  month: "mois",
  week: "semaine",
  year: "an",
  day: "jour",
  hour: "heure",
  active: "active",
  sold: "vendu",
  rented: "loué",
  withdrawn: "retiré",
  house: "maison",
  apartment: "appartement",
  land: "terrain",
  commercial: "bien commercial",
  other: "autre",
  "Real estate": "Immobilier",
  Menu: "Menu",
  "How it works": "Comment ça marche",
  "My listings": "Mes annonces",
  "Newsletter & membership": "Newsletter et adhésion",
  "Membership account": "Compte membre",
  "You are signed in.": "Vous êtes connecté.",
  "Sign in": "Se connecter",
  "Your membership is separate from your Nostr identity.":
    "Votre adhésion est distincte de votre identité Nostr.",
  "Newsletter signup is only available on the live Vastgoed site.":
    "L’inscription à la newsletter est uniquement disponible sur le site Vastgoed en ligne.",
  "No signup was sent. Open the live Vastgoed site to subscribe.":
    "Aucune demande d’inscription n’a été envoyée. Ouvrez le site Vastgoed en ligne pour vous inscrire.",
  "Membership is not enabled on this site.":
    "L’adhésion n’est pas activée sur ce site.",
  "Create a free membership to receive the Vastgoed newsletter.":
    "Inscrivez-vous gratuitement pour recevoir la newsletter Vastgoed.",
  "Email signup is available on the live Vastgoed site.":
    "L’inscription par e-mail est disponible sur le site Vastgoed en ligne.",
  "Newsletter signup requires the live Vastgoed site. No account or subscription was created in this preview.":
    "L’inscription à la newsletter nécessite le site Vastgoed en ligne. Aucun compte ni abonnement n’a été créé dans cet aperçu.",
  "This is a local preview. Email signup requires the live Vastgoed site; no subscription is created here.":
    "Ceci est un aperçu local. L’inscription nécessite le site Vastgoed en ligne ; aucune inscription n’est créée ici.",
  "Email signup requires the live Vastgoed site. No subscription was created in this local preview.":
    "L’inscription nécessite le site Vastgoed en ligne. Aucune inscription n’a été créée dans cet aperçu local.",
  "Join the email list. An email account cannot sign or manage Nostr listings, and verified email-to-npub pairing is not available in this release.":
    "Inscrivez-vous à la newsletter. Un compte e-mail ne permet pas de signer ni de gérer des annonces Nostr. L’association vérifiée entre e-mail et npub n’est pas disponible dans cette version.",
  "Create your free listing": "Créez votre annonce gratuite",
  "Start with your property, not an account.":
    "Commencez par votre bien, pas par un compte.",
  "Add the details and choose your photographs first. No email signup is needed. Choose a publishing identity when you are ready.":
    "Ajoutez d’abord les détails et choisissez vos photos. Aucune inscription par e-mail n’est nécessaire. Choisissez une identité de publication lorsque vous êtes prêt.",
  "Upload selected photos": "Importer les photos sélectionnées",
  "Selected photos stay on this device until you choose a signer and upload. Uploads are public.":
    "Les photos sélectionnées restent sur cet appareil jusqu’au choix d’un outil de signature et à leur envoi. Les fichiers envoyés sont publics.",
  Uploaded: "Envoyée",
  "Local photo, not uploaded": "Photo locale, non envoyée",
  "Remove photo": "Retirer la photo",
  "Choose at most 12 photographs per listing.":
    "Choisissez au maximum 12 photos par annonce.",
  "Photographs selected locally. Choose a signer and save your key backup before uploading.":
    "Photos sélectionnées localement. Choisissez un outil de signature et enregistrez la sauvegarde de votre clé avant l’envoi.",
  "Photographs selected locally. Choose a signer when you are ready to upload and publish.":
    "Photos sélectionnées localement. Choisissez un outil de signature lorsque vous êtes prêt à envoyer et publier.",
  "Wait for the current photo upload to finish.":
    "Attendez la fin de l’envoi de la photo en cours.",
  "Published descriptions, contact details, images and coordinates are public. Choose an extension or a new key pair to sign and publish. Keep your backup safe.":
    "Les descriptions, informations de contact, images et coordonnées publiées sont publiques. Choisissez une extension ou une nouvelle paire de clés pour signer et publier. Conservez votre sauvegarde en sécurité.",
  "Publishing identity": "Identité de publication",
  "Choose how to sign. No email account is required.":
    "Choisissez comment signer. Aucun compte e-mail n’est nécessaire.",
  "Use browser extension": "Utiliser une extension de navigateur",
  "Generate a new key pair": "Générer une nouvelle paire de clés",
  "An existing listing must keep its original publishing identity.":
    "Une annonce existante doit conserver son identité de publication d’origine.",
  "Back up your publishing key": "Sauvegardez votre clé de publication",
  "Keep your key private. Vastgoed cannot recover it.":
    "Gardez votre clé privée. Vastgoed ne peut pas la récupérer.",
  "The key stays in memory only. Reloading or disconnecting clears it.":
    "La clé reste uniquement en mémoire. Recharger la page ou se déconnecter l’efface.",
  "To manage listings later, import this backup into a trusted Nostr extension and connect it here.":
    "Pour gérer vos annonces ultérieurement, importez cette sauvegarde dans une extension Nostr de confiance et connectez-la ici.",
  "Download private key backup": "Télécharger la sauvegarde de la clé privée",
  "I saved my private key backup and understand that losing it means losing control of my listings.":
    "J’ai enregistré la sauvegarde de ma clé privée et je comprends que sa perte entraîne la perte du contrôle de mes annonces.",
  "Switching identities clears the generated private key from memory. Save your backup first. Vastgoed cannot recover it. Continue?":
    "Changer d’identité efface la clé privée générée de la mémoire. Enregistrez d’abord votre sauvegarde. Vastgoed ne peut pas la récupérer. Continuer ?",
  "Choose a publishing identity before continuing.":
    "Choisissez une identité de publication avant de continuer.",
  "The publishing identity does not match the generated key.":
    "L’identité de publication ne correspond pas à la clé générée.",
  "Download your private key backup and confirm that you saved it before continuing.":
    "Téléchargez la sauvegarde de votre clé privée et confirmez son enregistrement avant de continuer.",
  "Install a NIP-07 Nostr browser extension to sign with this identity.":
    "Installez une extension Nostr NIP-07 pour signer avec cette identité.",
  "Could not connect to the browser extension. Please try again.":
    "Impossible de se connecter à l’extension du navigateur. Réessayez.",
  "The browser extension returned an invalid public key.":
    "L’extension du navigateur a renvoyé une clé publique non valide.",
  "Could not generate a publishing key. Please try again.":
    "Impossible de générer une clé de publication. Réessayez.",
  "Could not download your key backup. Please try again.":
    "Impossible de télécharger la sauvegarde de votre clé. Réessayez.",
  "The publishing identity has changed. Please try again.":
    "L’identité de publication a changé. Réessayez.",
  "Generated key has been destroyed.": "La clé générée a été effacée.",
  "An open property network": "Un réseau immobilier ouvert",
  "How Vastgoed works": "Comment fonctionne Vastgoed",
  "Find a place in Europe. Share your property for free. Keep control of your publishing identity.":
    "Trouvez un lieu en Europe. Partagez votre bien gratuitement. Gardez le contrôle de votre identité de publication.",
  "Getting started": "Premiers pas",
  "01 / Explore": "01 / Explorer",
  "02 / Create": "02 / Créer",
  "03 / Publish": "03 / Publier",
  "Browse properties across Europe, refine your search and explore the map. You do not need an account to browse. Contact publishers using the details they choose to share.":
    "Parcourez les biens en Europe, affinez votre recherche et explorez la carte. Aucun compte n’est nécessaire pour consulter les annonces. Contactez les annonceurs grâce aux coordonnées qu’ils partagent.",
  "Start with your property": "Commencez par votre bien",
  "Open the composer and add your property details without an email signup. Stage photographs locally while you prepare your listing. Local previews are not published or backed up to the network.":
    "Ouvrez l’éditeur et ajoutez les détails de votre bien sans inscription par e-mail. Sélectionnez vos photos localement pendant la préparation de l’annonce. Les aperçus locaux ne sont ni publiés ni sauvegardés sur le réseau.",
  "Your listing. Your keys.": "Votre annonce. Vos clés.",
  "Choose a compatible Nostr browser extension or generate a new key pair. Generated keys stay in memory only. Download and confirm your plaintext private key backup before public photo uploads or signing. Vastgoed cannot recover a lost key.":
    "Choisissez une extension Nostr compatible ou générez une nouvelle paire de clés. Les clés générées restent uniquement en mémoire. Téléchargez la sauvegarde en texte clair de votre clé privée et confirmez son enregistrement avant tout envoi public de photos ou toute signature. Vastgoed ne peut pas récupérer une clé perdue.",
  "Built on Nostr": "Basé sur Nostr",
  "An open network, not a locked account":
    "Un réseau ouvert, pas un compte verrouillé",
  "Your key signs your listings; relays distribute them. Keep the same identity to manage your published properties. Relay availability and media hosting depend on the services you choose, and external fees may apply.":
    "Votre clé signe vos annonces ; les relais les diffusent. Gardez la même identité pour gérer vos biens publiés. La disponibilité des relais et l’hébergement des médias dépendent des services choisis ; des frais externes peuvent s’appliquer.",
  "Before you publish": "Avant de publier",
  "Do I need an email account to publish?":
    "Ai-je besoin d’un compte e-mail pour publier ?",
  "No. Publishing uses a Nostr identity, not an email membership. The email list is optional and cannot sign or manage your listings.":
    "Non. La publication utilise une identité Nostr, pas une adhésion par e-mail. La newsletter est facultative et ne permet pas de signer ni de gérer vos annonces.",
  "Who controls my listings?": "Qui contrôle mes annonces ?",
  "The publishing key is your authority to sign updates. Protect it and keep a secure backup. Vastgoed cannot recover a lost private key, and removing a listing does not guarantee that every relay or third party removes its copies.":
    "La clé de publication vous permet de signer les mises à jour. Protégez-la et conservez une sauvegarde sûre. Vastgoed ne peut pas récupérer une clé privée perdue, et supprimer une annonce ne garantit pas que tous les relais ou tiers suppriment leurs copies.",
  "What happens to my photographs?": "Que deviennent mes photos ?",
  "Staging a photograph locally is not the same as uploading it. Published media is public. Review photographs for visible personal information before uploading to your chosen media host.":
    "Sélectionner une photo localement n’équivaut pas à l’envoyer. Les médias publiés sont publics. Vérifiez l’absence d’informations personnelles visibles avant l’envoi à l’hébergeur de votre choix.",
  "How can I receive the Vastgoed edit?":
    "Comment recevoir la sélection Vastgoed ?",
  "Subscribe to the optional email list on the live Vastgoed site. Local preview does not create a subscription. Your membership is separate from your Nostr identity.":
    "Inscrivez-vous à la newsletter facultative sur le site Vastgoed en ligne. L’aperçu local ne crée pas d’abonnement. Votre adhésion est distincte de votre identité Nostr.",
  "Subscribe to the optional email list on the live Vastgoed site. Your membership is separate from your Nostr identity.":
    "Inscrivez-vous à la newsletter facultative sur le site Vastgoed en ligne. Votre adhésion est distincte de votre identité Nostr.",
  "Guides and ideas": "Guides et idées",
  "Field notes": "Notes de terrain",
  "Read the story": "Lire l’article",
  "There are no journal articles published yet. The getting-started guide above is always available.":
    "Aucun article du journal n’est encore publié. Le guide de démarrage ci-dessus reste toujours disponible.",
  "Start with your property and photographs. No signup is needed. Choose a browser extension or generate a new key pair when you are ready.":
    "Commencez par votre bien et vos photos. Aucune inscription n’est nécessaire. Choisissez une extension ou générez une nouvelle paire de clés lorsque vous êtes prêt.",
  "Add your property details and select photographs locally, without an account.":
    "Ajoutez les détails de votre bien et sélectionnez vos photos localement, sans compte.",
  "Choose your publishing identity": "Choisissez votre identité de publication",
  "Use a browser extension or generate a new key pair. Generated keys stay in memory only: download and confirm your plaintext backup before public uploads or signing.":
    "Utilisez une extension ou générez une nouvelle paire de clés. Les clés générées restent uniquement en mémoire : téléchargez votre sauvegarde en texte clair et confirmez son enregistrement avant tout envoi public ou toute signature.",
  "Upload your selected photographs, review your listing, then sign and publish to your chosen relays.":
    "Envoyez vos photos sélectionnées, vérifiez votre annonce, puis signez et publiez sur les relais de votre choix.",
} satisfies Record<keyof typeof nl, string>;

export default fr;
