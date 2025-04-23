# CitizenX

A decentralized Chrome extension for annotating websites in order to bring a knowledge layer on top of the internet.

## Requirements - v1.0
1. We want the user to be unique and the same if he changes device, clears his browser data or loses his device
2. We want the user to have a profile picture and a handle
3. We want pages from different languages and with non functional parameters (like UTM parameters) to be considered the same page
4. We want the Chrome extension to maintain a list of the history of pages visited by the user
5. We want the user to be notified through the extension when annotations are made by someone else on the pages he visited
6. We want the user to be notified through the extension when comments are made on his annotation
7. We want the comments to be a thread under the annotation
8. We want the persistence to be decentralized using IPFS
9. We want the notifications and other collaborative features to not rely on some centralized server

## Non Functional Requirements - v1.0
1. Except Chrome Extension we want 0 installation on the user's device
2. We want it 100% serverless storing data on IPFS
3. We want the authentication also to be decentralized
4. We want to ensure as much as possible 0 loss of data in case of network issues or other failures
5. We want the chrome extension to be minimal in terms of content and the real UI and other content pieces to be served from a gitbub.io page
6. We want to secure the JWT tokens and other access technologies against hacking 

## Requirements - Future Versions

1. We want a crypto / ledger based ownership structure of the project
2. Ww want a crypto based system for paying for the project (paying the contributors, the users if there is profit and any other system we connect with as needed)
3. We want a system allowing to share our annotations on social platforms, messages and emails for growth hacking
4. We want to enrich annotations with structured data allowing complex reasoning on them
5. Use a WYSIWYG editor for Annotations (but not comments)

## Non Functional Requirements - Future Versions

1. Add a pinning service - most probably our own but distributed among willing users and incentivize them in some crypto way
2. Restructure the OrbitDB organization so that not every user replicates all of the annotations from the whole world but only those from pages they visited (or visit now) and pages they annotated



